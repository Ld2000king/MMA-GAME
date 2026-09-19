# אורז את כל המשחק לקובץ אחד: dist/boxing.html
# הרצה: python build.py
import os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
read = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()

html = read('index.html')
fonts = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com[^"]+)">', html).group(1)
scripts = re.findall(r'<script src="([^"]+)"></script>', html)

out = f'''<title>הדרך לחגורה</title>
<meta name="theme-color" content="#0a0c11">
<link rel="stylesheet" href="{fonts}">
<style>
{read('style.css')}
</style>
<div id="app" dir="rtl" lang="he"></div>
<div id="toast" role="status" aria-live="polite"></div>
''' + '\n'.join(f'<script>\n{read(s)}\n</script>' for s in scripts) + '\n'

# המסמך העוטף לא מגדיר dir=rtl, אז מגדירים אותו מהסקריפט
out = out.replace('<div id="app" dir="rtl" lang="he"></div>',
                  '<div id="app" dir="rtl" lang="he"></div>\n<script>document.documentElement.dir = "rtl"; document.documentElement.lang = "he";</script>')

os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
open(os.path.join(ROOT, 'dist', 'boxing.html'), 'w', encoding='utf-8').write(out)
print('dist/boxing.html', len(out.encode('utf-8')) // 1024, 'KB')
