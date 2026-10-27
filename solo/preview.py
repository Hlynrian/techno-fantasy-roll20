from pathlib import Path
import re
r=Path(__file__).parent
html=(r/'sheet.html').read_text()
html=re.sub(r'<script type="text/worker">[\s\S]*?</script>','',html)
html=re.sub(r'<rolltemplate[\s\S]*?</rolltemplate>','',html)
(r/'preview.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>TFA 2E Solo Crew · Layout preview</title><style>body{margin:0;padding:20px;background:#d7ddd6}fieldset{border:0;margin:0;padding:0}.preview-note{font:13px Arial;max-width:1100px}button:disabled{opacity:.65}</style><style>'+(r/'sheet.css').read_text()+'</style><p class="preview-note">Interactive layout preview · sample data is not saved. Rolls are available inside Roll20 only.</p>'+html+'<script>'+(r/'preview.js').read_text()+'</script></html>')
