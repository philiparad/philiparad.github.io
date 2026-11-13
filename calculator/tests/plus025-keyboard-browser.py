#!/usr/bin/env python3
"""PLUS-025: live browser focus and shortcut-isolation checks, modular + standalone."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
FILES = ("index.html", "fx991_fresh_standalone.html")


async def snap(page):
    return await page.evaluate("window.FreshCalculator.getState()")


async def check(page, file):
    # With the document focused, browser navigation must not trigger calculator keys.
    await page.evaluate("document.activeElement.blur()")
    before = await snap(page)
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("Home")
    await page.keyboard.press("F3")
    await page.keyboard.press("Backspace")
    after = await snap(page)
    assert before["mode"] == after["mode"] == "COMP", (file, "document MODE")
    assert before["screen"] == after["screen"], (file, "document screen")
    assert before["input"] == after["input"], (file, "document input")

    # Explicit face focus opts into the calculator keyboard.
    await page.locator("#face").focus()
    await page.keyboard.press("1")
    await page.keyboard.press("+")
    await page.keyboard.press("2")
    s = await snap(page)
    assert s["input"] == "1+2", (file, "face entry", s["input"])
    await page.keyboard.press("Enter")
    s = await snap(page)
    assert s["screen"] == "result", (file, "face Enter", s["screen"])

    # A normal HTML input must receive native keys without changing the calculator.
    await page.evaluate("""() => {
      const input = document.createElement('input');
      input.id = 'plus025-native-input';
      document.body.appendChild(input);
      input.focus();
    }""")
    unchanged = await snap(page)
    await page.keyboard.type("123")
    await page.keyboard.press("ArrowLeft")
    await page.keyboard.press("Backspace")
    await page.keyboard.press("Home")
    assert await page.locator("#plus025-native-input").input_value() == "13"
    current = await snap(page)
    assert current["mode"] == unchanged["mode"]
    assert current["input"] == unchanged["input"]
    assert current["screen"] == unchanged["screen"]

    # Native Tab order must move the browser focus; it must not activate AC.
    await page.keyboard.press("Tab")
    s = await snap(page)
    assert s["screen"] == unchanged["screen"], (file, "Tab activated calculator")

    # Physical key button Enter uses native button activation, not a double dispatch.
    await page.goto(page.url.split("?")[0] + "?plus025=key-button", wait_until="load")
    button = page.locator("#keys button[data-key='1']")
    await button.focus()
    await page.keyboard.press("Enter")
    s = await snap(page)
    assert s["input"] == "1", (file, "focused Enter should click once", s["input"])

    # Shift navigation must not be treated as a calculator replay key.
    await page.locator("#face").focus()
    base = await snap(page)
    await page.keyboard.press("Shift+ArrowUp")
    now = await snap(page)
    assert now["input"] == base["input"], (file, "Shift navigation")
    print("PLUS-025 PASS", file, "document/input/button/face focus")


async def main():
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    root = "http://127.0.0.1:" + str(server.server_address[1]) + "/calculator/"
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch()
            try:
                for file in FILES:
                    page = await browser.new_page()
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    await page.goto(root + file, wait_until="load")
                    await page.locator("#keys button[data-key='1']").wait_for()
                    await check(page, file)
                    assert not errors, (file, errors)
                    await page.close()
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    asyncio.run(main())
