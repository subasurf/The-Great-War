import sys, asyncio
from playwright.async_api import async_playwright
NAT=sys.argv[1]; PLAN=sys.argv[2]; T=int(sys.argv[3]); OUT=sys.argv[4]; MODE=sys.argv[5] if len(sys.argv)>5 else 'alliance'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1600,'height':1000})
        pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('file://' + __import__('os').path.abspath('index.html') + '')
        await pg.wait_for_function('document.getElementById("start").style.display==="flex"', timeout=60000)
        txt = await pg.evaluate('''([NAT,PLAN,T,MODE])=>{ startGame(NAT, PLAN==='-'?null:PLAN); closeModal();
          for(let t=0;t<T && !G.over;t++){ aiTurn(G.player); endTurn(); G.pending.slice().forEach(id=>resolvePending(id,0)); }
          UI.mode=MODE; recolor(); renderSide(); fitView(); UI.s=Math.max(UI.vw/MAP_W,UI.vh/MAP_H); clampView(); draw();
          const W=G.armies.filter(a=>a.nat==='GER').map(a=>P(a.prov).name+':'+a.div).join(', ');
          const R=G.armies.filter(a=>a.nat==='RUS').map(a=>P(a.prov).name+':'+a.div).join(', ');
          return dateStr()+'\\nGER '+W+'\\nRUS '+R; }''', [NAT,PLAN,T,MODE])
        print(txt)
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=OUT)
        await b.close()
asyncio.run(main())
