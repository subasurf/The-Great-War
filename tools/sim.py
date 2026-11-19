import sys, json, asyncio
from playwright.async_api import async_playwright
NAT = sys.argv[1]; PLAN = sys.argv[2]; TURNS = int(sys.argv[3])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1500,'height':900})
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + __import__('os').path.abspath('index.html') + '')
        await pg.wait_for_function('document.getElementById("start").style.display==="flex"', timeout=60000)
        res = await pg.evaluate('''([NAT,PLAN,T])=>{
          newGame(NAT, PLAN==='-'?null:PLAN); computeSupply(); const out=[];
          const keys=['par','bru','lie','lil','ver','met','war','kon','lem','bgd','sko','trs','con','gpl','buc','rig','kiv','ber','vie'];
          for(let t=0;t<T && !G.over;t++){
            aiTurn(G.player); const r=endTurn(); G.pending.slice().forEach(id=>resolvePending(id,0));
            const ws={}; for(const k of ['GER','AUH','OTT','BUL','FRA','GBR','RUS','ITA','USA','ROM','SRB']) ws[k]=(N(k).side||(N(k).out?'X':'-'))+Math.round(N(k).ws);
            const ctrl=keys.map(k=>k+':'+P(MAP.idx[k]).ctrl).join(' ');
            const div={}; for(const k of ['GER','AUH','FRA','GBR','RUS','ITA','OTT','USA']) div[k]=nArmies(k).reduce((s,a)=>s+a.div,0);
            const occ={}; for(const k of ['GER','AUH','FRA','RUS','ITA','SRB','BEL']) occ[k]=Math.round(occupiedFrac(k)*100);
            const eco={}; for(const k of ['GER','FRA','GBR','RUS','AUH']) eco[k]=`$${Math.round(N(k).money)} m${Math.round(N(k).mun)} mp${Math.round(N(k).mp)} ic${Math.round(N(k).ic)} sh${N(k).shortage.toFixed(2)}`;
            out.push(`${dateStr()} B${r.battles.filter(x=>!x.empty).length} ws ${JSON.stringify(ws)}\\n   occ ${JSON.stringify(occ)} div ${JSON.stringify(div)}\\n   ${ctrl}\\n   ${JSON.stringify(eco)} usa${Math.round(G.usaTension)} blk${G.blockade.toFixed(2)} cas GER ${Math.round(N('GER').stats.cas)} FRA ${Math.round(N('FRA').stats.cas)} RUS ${Math.round(N('RUS').stats.cas)}` + r.news.filter(n=>n.type==='major').map(n=>'\\n   * '+n.txt.slice(0,100)).join(''));
          }
          return out.join('\\n')+'\\nOVER '+JSON.stringify(G.over);
        }''', [NAT, PLAN, TURNS])
        print(res)
        print('ERRORS', errs[:5])
        await b.close()
asyncio.run(main())
