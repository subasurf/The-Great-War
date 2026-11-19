import sys, asyncio
from playwright.async_api import async_playwright
CODE = sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1500,'height':900})
        pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('file://' + __import__('os').path.abspath('index.html') + '')
        await pg.wait_for_function('document.getElementById("start").style.display==="flex"', timeout=60000)
        r = await pg.evaluate(CODE)
        print(r)
        await b.close()
asyncio.run(main())
