#!/usr/bin/env python3
"""VIS-001 — reference-inspired Windows emulator face visual contracts.
Tests browser DOM, computed geometry/color/legends and modular/standalone pixels.
Reference geometry comes from user-supplied comparison screenshot; not native CASIO hardware certification.
"""
import asyncio
import functools
import http.server
import pathlib
import threading
import hashlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUTPUT = pathlib.Path("/tmp/vis001-face-evidence")
OUTPUT.mkdir(parents=True, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

async def inspect(browser, host, name):
    context = await browser.new_context(viewport={"width": 1440, "height": 1080}, device_scale_factor=1)
    page = await context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    await page.goto(host + "/calculator/" + name)
    await page.locator(".key-unit button").first.wait_for()
    metrics = await page.evaluate("""() => {
      const $=s=>document.querySelector(s);
      const css=(s,p)=>getComputedStyle($(s)).getPropertyValue(p).trim();
      const face=$('#face'),fr=face.getBoundingClientRect();
      const keys=[...document.querySelectorAll('.key-unit')].map(el=>{
        const b=el.querySelector('button'),r=b.getBoundingClientRect();
        return {key:b.dataset.key,x:r.x-fr.x,y:r.y-fr.y,w:r.width,h:r.height};
      });
      return {model:document.querySelector('#keys').dataset.model,
       width:fr.width,height:fr.height,keyCount:keys.length,
       faceColor:css('.face','background-color'),
       solar:css('.solar-recess','display'),edition:css('.edition-mark','display'),
       science:css('.button-CALC button','background-color'),
       numeric:css('.button-7 button','background-color'),
       del:css('.button-DEL button','background-color'),
       shift:css('.button-CALC .shift-label','color'),
       alpha:css('.button-ALPHA .alpha-label','color'),
       shiftOpacity:css('.button-CALC .shift-label','opacity'),
       topMode:document.querySelector('.button-MODE .shift-label').textContent,
       bases:[...document.querySelectorAll('.base-label')].map(x=>x.textContent),
       glyphs:document.querySelectorAll('.face-glyph svg').length,keys};
    }""")
    assert metrics["model"]=="fx-991es-plus",metrics["model"]
    assert metrics["keyCount"]==50,metrics["keyCount"]
    assert abs(metrics["width"]-348)<1,metrics["width"]
    assert metrics["faceColor"]=="rgb(75, 75, 75)",metrics["faceColor"]
    assert metrics["solar"]=="none" and metrics["edition"]=="none"
    assert metrics["science"]=="rgb(9, 10, 11)"
    assert metrics["numeric"]=="rgb(153, 153, 155)"
    assert metrics["del"]=="rgb(130, 196, 21)"
    assert metrics["shift"]=="rgb(255, 206, 37)",metrics["shift"]
    assert metrics["alpha"]=="rgb(253, 110, 145)",metrics["alpha"]
    assert metrics["shiftOpacity"]=="1"
    assert metrics["topMode"]=="MODE SETUP"
    assert metrics["bases"]==["DEC","HEX","BIN","OCT"]
    assert metrics["glyphs"]==4
    assert all(k["x"]>=0 and k["x"]+k["w"]<=metrics["width"]+1 and
               k["y"]>=0 and k["y"]+k["h"]<=metrics["height"]+1
               for k in metrics["keys"]),"Physical keys extend beyond calculator face"
    # VIS-002: MODE/SETUP and ON captions must not overlap at small and full face sizes.
    for face_width in (220,274,334,348):
        collision=await page.evaluate("""width => {
          const face=document.querySelector('#face');
          face.style.width=width+'px';face.style.maxWidth='none';
          const mode=document.querySelector('.button-MODE .shift-label').getBoundingClientRect();
          const on=document.querySelector('.button-ON .shift-label').getBoundingClientRect();
          const casing=face.getBoundingClientRect();
          return {width,modeRight:mode.right,onLeft:on.left,onRight:on.right,faceRight:casing.right};
        }""",face_width)
        assert collision["modeRight"]+1 <= collision["onLeft"],("ON and MODE captions overlap",name,collision)
        assert collision["onRight"] <= collision["faceRight"]+1,("ON caption outside face",name,collision)
    await page.evaluate("""() => {document.querySelector('#face').style.removeProperty('width');
                          document.querySelector('#face').style.removeProperty('max-width');}""")
    assert not errors,errors
    image=await page.locator("#face").screenshot()
    (OUTPUT / (name+".png")).write_bytes(image)
    result={"name":name,"image_sha256":hashlib.sha256(image).hexdigest(),"metrics":metrics}
    await context.close()
    return result

async def main():
    server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(QuietHandler,directory=str(ROOT)))
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            root="http://127.0.0.1:"+str(server.server_address[1])
            a=await inspect(browser,root,"index.html")
            b=await inspect(browser,root,"fx991_fresh_standalone.html")
            assert a["image_sha256"]==b["image_sha256"],("Screenshots differ",a["image_sha256"],b["image_sha256"])
            assert a["metrics"]==b["metrics"],"Computed modular and standalone geometry differs"
            await browser.close()
            print("VIS-001 PASS: 50 keys, colors, screen geometry, glyphs, legends and pixel-identical modular/standalone screenshots")
            print("Image SHA-256:",a["image_sha256"])
    finally:
        server.shutdown()

if __name__=="__main__":
    asyncio.run(main())
