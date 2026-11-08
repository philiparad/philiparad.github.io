"""REA-020 web-only LCD contrast regression; not native device verification."""
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]


def check(page):
    page.goto((ROOT / "index.html").as_uri())
    page.wait_for_function("Boolean(window.FreshCalculator && window.FreshLCD)")
    result = page.evaluate("""() => {
        const state = window.FreshCalculator.getState();
        const lcd = window.FreshLCD;
        const logical = [];
        const colors = [];
        for (const level of [0, 5, 9]) {
            const trial = { ...state, contrast: level };
            const canvas = document.createElement('canvas');
            lcd.draw(canvas, trial);
            logical.push(Array.from(lcd.rasterize(trial)));
            const image = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
            const active = logical[logical.length - 1].findIndex(Boolean);
            if (active < 0) throw new Error('No active LCD pixels to sample');
            const x = (active % lcd.width) * 8 + 2;
            const y = Math.floor(active / lcd.width) * 8 + 2;
            const i = (y * canvas.width + x) * 4;
            colors.push(Array.from(image.data.slice(i, i + 3)));
        }
        return {logicalEqual: logical.every(p=>p.every((v,i)=>v===logical[0][i])),
                colors, stateUnchanged: window.FreshCalculator.getState().contrast===state.contrast};
    }""")
    assert result["logicalEqual"], "Contrast must never change LCD logical pixels"
    assert result["stateUnchanged"], "Pure LCD rendering must not mutate calculator state"
    assert result["colors"][1] == [29, 40, 34], result["colors"]
    brightness = [sum(c) for c in result["colors"]]
    assert brightness[0] > brightness[1] > brightness[2], result["colors"]
    return result


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            for name in ("index.html", "fx991_fresh_standalone.html"):
                page = browser.new_page()
                # Reuse the identical assertions on the two distributable builds.
                original_root = ROOT / "index.html"
                page.goto((ROOT / name).as_uri())
                page.wait_for_function("Boolean(window.FreshCalculator && window.FreshLCD)")
                result = page.evaluate("""() => {
                    const s = window.FreshCalculator.getState(), d = window.FreshLCD;
                    const samples = [];
                    for (const level of [0,5,9]) {
                        const c = document.createElement('canvas');
                        d.draw(c, {...s, contrast:level});
                        const raster = d.rasterize({...s,contrast:level});
                        const first = Array.from(raster).findIndex(Boolean);
                        if (first < 0) throw new Error('No lit pixel');
                        const x=first%d.width*8+2, y=Math.floor(first/d.width)*8+2;
                        const data=c.getContext('2d').getImageData(x,y,1,1).data;
                        samples.push({pixels:Array.from(raster),ink:Array.from(data.slice(0,3))});
                    }
                    return {equal:samples.every(a=>a.pixels.every((v,i)=>v===samples[0].pixels[i])),
                            inks:samples.map(a=>a.ink), unchanged:window.FreshCalculator.getState().contrast===s.contrast};
                }""")
                assert result["equal"] and result["unchanged"], (name,result)
                assert result["inks"][1] == [29,40,34], (name,result["inks"])
                assert sum(result["inks"][0]) > sum(result["inks"][1]) > sum(result["inks"][2]), (name,result["inks"])
                print(name, "PASS", result["inks"])
                page.close()
        finally:
            browser.close()


if __name__ == "__main__":
    main()
