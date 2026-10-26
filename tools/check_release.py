"""Validate reproducibility, catalog integrity and development-only exclusion."""
from pathlib import Path
import hashlib,json
from build_web_plugin import build,validate_package
r=Path(__file__).resolve().parent.parent
p=r/'packages/role-room-0.1.0.skivu.json';raw=p.read_bytes();package=validate_package(raw)
assert build(r/'src')==raw,'Package does not reproduce from source'
catalog=json.loads((r/'catalog/apps.json').read_text('utf-8'));entry=catalog['packages'][0]
assert entry['manifest']==package['manifest']
assert entry['bytes']==len(raw)
assert entry['sha256']==hashlib.sha256(raw).hexdigest()
assert entry['url']=='https://github.com/skyjjgw/skivu-role-room/releases/download/v0.1.0/role-room-0.1.0.skivu.json'
assert package['manifest']['networkDomains']==[]
assert all(not n.startswith(('tests/','tools/','qa/')) and n!='skivu-sdk.js' for n in package['files'])
assert package['licenseText']==(r/'LICENSE').read_text('utf-8')
print(json.dumps({'bytes':len(raw),'sha256':entry['sha256'],'reproducible':True,'catalogValid':True,'developmentFilesExcluded':True}))
