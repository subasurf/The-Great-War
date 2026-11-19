import sys, asyncio
from playwright.async_api import async_playwright
N=int(sys.argv[1]); T=int(sys.argv[2])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page()
        pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto('file://' + __import__('os').path.abspath('index.html') + '')
        await pg.wait_for_function('document.getElementById("start").style.display==="flex"', timeout=60000)
        r = await pg.evaluate('''([NR,T])=>{ const out=[]; for(let k=0;k<NR;k++){ newGame("SWE",null); const marks=[];
          for(let t=0;t<T && !G.over;t++){ endTurn(); G.pending.slice().forEach(id=>resolvePending(id,0));
            if(G.turn%6===0) marks.push(dateStr(G.turn).slice(0,3)+String(curYear()).slice(2)+" occ G"+Math.round(occupiedFrac("GER")*100)+" F"+Math.round(occupiedFrac("FRA")*100)+" B"+Math.round(occupiedFrac("BEL")*100)+" R"+Math.round(occupiedFrac("RUS")*100)+" A"+Math.round(occupiedFrac("AUH")*100)+" S"+Math.round(occupiedFrac("SRB")*100)+" I"+Math.round(occupiedFrac("ITA")*100)+" ws G"+Math.round(N("GER").ws)+" F"+Math.round(N("FRA").ws)+" R"+Math.round(N("RUS").ws)+" A"+Math.round(N("AUH").ws)+" B"+Math.round(N("GBR").ws)); }
          const ev=G.log.filter(l=>l.type==="major").map(l=>dateStr(l.t).slice(0,3)+(1914+Math.floor((6+l.t)/12))+": "+l.txt.slice(0,70));
          out.push("RUN "+k+" plans "+JSON.stringify(G.plans)+"\\n  "+marks.join("\\n  ")+"\\n  OVER "+JSON.stringify(G.over)+" at "+dateStr()+"\\n  cas G"+Math.round(N("GER").stats.cas)+" F"+Math.round(N("FRA").stats.cas)+" R"+Math.round(N("RUS").stats.cas)+" B"+Math.round(N("GBR").stats.cas)+" A"+Math.round(N("AUH").stats.cas)+"\\n  "+ev.filter(e=>!/Luxembourg/.test(e)).join("\\n  "));
        } return out.join("\\n"); }''', [N,T])
        print(r)
        await b.close()
asyncio.run(main())
