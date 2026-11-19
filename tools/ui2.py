import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1500,'height':920})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + __import__('os').path.abspath('index.html') + '')
        await pg.wait_for_function('document.getElementById("start").style.display==="flex"', timeout=60000)
        await pg.click('.natcard[data-id="GER"]'); await pg.click('.choice[data-v="W"]'); await pg.click('#go')
        await pg.evaluate('G.pending.push("lusitania"); showPending();')
        await pg.wait_for_timeout(300); await pg.screenshot(path='test/u_event.png')
        await pg.click('.choice'); 
        # zoom in on the west front after a few turns
        await pg.evaluate('for(let t=0;t<14;t++){ aiTurn(G.player); endTurn(); G.pending=[]; } recolor(); renderSide(); UI.s=2.6; const i=MAP.idx.ver; UI.ox=UI.vw/2-MAP.ax[i]*UI.s; UI.oy=UI.vh/2-MAP.ay[i]*UI.s; clampView(); UI.sel={prov:MAP.idx.met,army:null}; UI.tab="prov"; renderSide(); draw();')
        await pg.wait_for_timeout(400); await pg.screenshot(path='test/u_zoom.png')
        await pg.evaluate('G.over={winner:"C",reason:"France has fallen and the Entente has collapsed."}; checkOver();')
        await pg.wait_for_timeout(300); await pg.screenshot(path='test/u_over.png')
        m = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        m.on('pageerror', lambda e: errs.append('m:'+str(e)))
        await m.goto('file://' + __import__('os').path.abspath('index.html') + '')
        await m.wait_for_function('document.getElementById("start").style.display==="flex"', timeout=60000)
        await m.screenshot(path='test/m_start.png')
        await m.evaluate('startGame("RUS","P"); closeModal();'); await m.wait_for_timeout(500)
        await m.screenshot(path='test/m_game.png')
        print('ERRORS', errs)
        await b.close()
asyncio.run(main())
