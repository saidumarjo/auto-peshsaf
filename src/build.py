head='''<!doctype html>
<html lang="tg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#1c3557">
<meta name="description" content="Системаи идораи дархостҳо: муштариён, коргарон ва роҳбар.">
<title>Дархостҳо</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400&family=PT+Serif:wght@400;700&family=PT+Mono&display=swap">
<style>
'''
out=head+open('style.css').read()+'</style>\n</head>\n<body>\n<div id="app"></div>\n<script type="module">\n'+open('fb.js').read()+'</script>\n</body>\n</html>\n'
open('../index.html','w').write(out)
print(len(out))
