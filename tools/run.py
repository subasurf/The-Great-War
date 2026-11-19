import sys, json, asyncio
from playwright.async_api import async_playwright
NAT = sys.argv[1] if len(sys.argv)>1 else 'GER'
PLAN = sys.argv[2] if len(sys.argv)>2 else 'W'
TURNS = int(sys.argv[3]) if len(sys.argv)>3 else 30
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1500,'height':900})
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        await pg.goto('file://' + __import__('os').path.abspath('index.html') + '')
        await pg.wait_for_function('document.getElementById("start").style.display==="flex"', timeout=60000)
        print('map ms', await pg.evaluate('window.__mapMs'))
        await pg.screenshot(path='/home/claude/gw/test/start.png')
        await pg.evaluate(f'startGame("{NAT}", {json.dumps(PLAN) if PLAN!="-" else "null"}); closeModal();')
        await pg.wait_for_timeout(500)
        await pg.screenshot(path='/home/claude/gw/test/t0.png')
        stats = await pg.evaluate('''(T)=>{
          const out=[]; const keys=['par','bru','anw','lie','war','bgd','lem','prz','kon','ver','met','lil','trs','con','gpl','buc','sko','rig','kov','kiv'];
          for(let t=0;t<T && !G.over;t++){
            aiTurn(G.player);
            const r=endTurn(); G.pending.forEach(id=>resolvePending(id,0));
            const ws={}; for(const k of ['GER','AUH','OTT','BUL','FRA','GBR','RUS','ITA','USA','ROM','SRB']) ws[k]=(N(k).side||(N(k).out?'X':'-'))+Math.round(N(k).ws);
            const ctrl={}; for(const k of keys) ctrl[k]=P(MAP.idx[k]).ctrl;
            const div={}; for(const k of ['GER','FRA','RUS','AUH','GBR','ITA']) div[k]=nArmies(k).reduce((s,a)=>s+a.div,0);
            out.push({d:dateStr(), b:r.battles.filter(x=>!x.empty).length, cap:r.battles.filter(x=>x.result==='captured').length, ws, ctrl, div,
              mun:{GER:Math.round(N('GER').mun),FRA:Math.round(N('FRA').mun),RUS:Math.round(N('RUS').mun)}, money:{GER:Math.round(N('GER').money),FRA:Math.round(N('FRA').money),GBR:Math.round(N('GBR').money),RUS:Math.round(N('RUS').money)},
              mp:{GER:Math.round(N('GER').mp),FRA:Math.round(N('FRA').mp),RUS:Math.round(N('RUS').mp)}, cas:{GER:Math.round(N('GER').stats.cas),FRA:Math.round(N('FRA').stats.cas),RUS:Math.round(N('RUS').stats.cas)},
              news:r.news.filter(n=>n.type==='major').map(n=>n.txt.slice(0,90)), techs:N('GER').techs.length, usa:Math.round(G.usaTension), blk:G.blockade.toFixed(2), short:N('GER').shortage.toFixed(2)});
          }
          return {out, over:G.over};
        }''', TURNS)
        for s in stats['out']:
            print(s['d'], 'battles',s['b'],'cap',s['cap'],'ws',s['ws'])
            print('   ctrl',' '.join(f"{k}:{v}" for k,v in s['ctrl'].items()))
            print('   div',s['div'],'mun',s['mun'],'money',s['money'],'mp',s['mp'],'cas',s['cas'],'tech',s['techs'],'usa',s['usa'],'blk',s['blk'],'short',s['short'])
            for n in s['news']: print('   *',n)
        print('OVER', stats['over'])
        await pg.evaluate('recolor(); renderSide(); showReport();')
        await pg.wait_for_timeout(400)
        await pg.screenshot(path='/home/claude/gw/test/report.png')
        await pg.evaluate('closeModal(); fitView(); draw();')
        await pg.wait_for_timeout(300)
        await pg.screenshot(path='/home/claude/gw/test/end.png')
        print('ERRORS', errs[:10])
        await b.close()
asyncio.run(main())
