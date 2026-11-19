import os
d='src'
css=open(f'{d}/style.css').read()
body=open(f'{d}/body.html').read()
js='\n'.join(open(f'{d}/{f}').read() for f in ['data.js','map.js','engine.js','ui.js'])
html=f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Great War — 1914</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Special+Elite&display=swap" rel="stylesheet">
<style>{css}</style></head><body>
{body}
<script>
{js}
</script></body></html>'''

open('index.html','w').write(html)
print(len(html))
