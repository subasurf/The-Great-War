import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1500,'height':920})
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + __import__('os').path.abspath('index.html') + '')
        await pg.wait_for_function('document.getElementById("start").style.display==="flex"', timeout=60000)
        await pg.screenshot(path='test/u_start.png')
        await pg.click('.natcard[data-id="FRA"]')
        await pg.wait_for_timeout(300)
        await pg.screenshot(path='test/u_plan.png')
        await pg.click('.choice[data-v="D"]')
        await pg.wait_for_timeout(500)
        await pg.screenshot(path='test/u_intro.png')
        await pg.click('#go')
        # click on an army counter: find a French army counter
        c = await pg.evaluate('(()=>{ const c=UI.counters.find(c=>c.nat===G.player); const r=document.getElementById("map").getBoundingClientRect(); return c?{x:r.left+c.x+c.w/2,y:r.top+c.y+c.h/2,prov:c.prov}:null })()')
        print('counter', c)
        await pg.mouse.click(c['x'], c['y'])
        await pg.wait_for_timeout(300)
        await pg.screenshot(path='test/u_army.png')
        # right click on a neighbouring province (toward the German border)
        tgt = await pg.evaluate('''(()=>{ const a=selArmy(); const j=LADJ[a.prov].find(j=>P(j).owner==="GER")||LADJ[a.prov][0]; const [x,y]=toScreen(MAP.ax[j],MAP.ay[j]); const r=document.getElementById("map").getBoundingClientRect(); return {x:r.left+x,y:r.top+y,name:P(j).name}; })()''')
        print('target', tgt)
        await pg.mouse.move(tgt['x'], tgt['y'])
        await pg.wait_for_timeout(300)
        await pg.screenshot(path='test/u_hover.png')
        await pg.mouse.click(tgt['x'], tgt['y'], button='right')
        await pg.wait_for_timeout(300)
        print('orders', await pg.evaluate('JSON.stringify(selArmy().path)'))
        await pg.screenshot(path='test/u_order.png')
        await pg.click('#endturn')
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path='test/u_report.png')
        # cycle through few turns through UI
        for t in range(6):
            while await pg.evaluate('document.getElementById("modal").classList.contains("show")'):
                btn = await pg.query_selector('#rpOk, .choice, #goMap')
                if not btn: break
                await btn.click(); await pg.wait_for_timeout(200)
            await pg.click('#endturn'); await pg.wait_for_timeout(1200)
        await pg.screenshot(path='test/u_report2.png')
        while await pg.evaluate('document.getElementById("modal").classList.contains("show")'):
            btn = await pg.query_selector('#rpOk, .choice, #goMap')
            if not btn: break
            await btn.click(); await pg.wait_for_timeout(200)
        for tab in ['nation','dip','res','trade','ledger']:
            await pg.click(f'#tabs button[data-tab="{tab}"]'); await pg.wait_for_timeout(200)
            await pg.screenshot(path=f'test/u_tab_{tab}.png')
        await pg.click('#mapmodes button[data-mode="alliance"]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='test/u_alliance.png')
        print('date', await pg.evaluate('dateStr()'))
        print('ERRORS', errs)
        await b.close()
asyncio.run(main())
