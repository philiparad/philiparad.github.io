#!/usr/bin/env python3
"""Real JSXGraph 1.10.1 Chromium smoke test. No mocked renderer."""
import argparse, datetime, json, os, pathlib, sys
from playwright.sync_api import sync_playwright

ap=argparse.ArgumentParser()
ap.add_argument('--output', default='geometry-chart-qa/qa-output')
args=ap.parse_args()
out=pathlib.Path(args.output)
out.mkdir(parents=True, exist_ok=True)
js=pathlib.Path('node_modules/jsxgraph/distrib/jsxgraphcore.js')
css=pathlib.Path('node_modules/jsxgraph/distrib/jsxgraph.css')
package=pathlib.Path('node_modules/jsxgraph/package.json')
report={'task':'GQC-010','test':'real JSXGraph browser smoke','status':'BLOCKED','errors':[],
        'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
def finish(code):
    (out/'smoke_audit.json').write_text(json.dumps(report, indent=2)+'\n',encoding='utf-8')
    print('JSXGraph smoke:',report['status'])
    sys.exit(code)
if not all(p.is_file() for p in (js,css,package)):
    report['errors'].append('Missing pinned JSXGraph files')
    finish(2)
version=json.loads(package.read_text())['version']
report['installed_version']=version
if version!='1.10.1':
    report['status']='FAIL'
    report['errors'].append('Incorrect JSXGraph version')
    finish(1)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
        report['chromium_version']=browser.version
        page=browser.new_page(viewport={'width':900,'height':700})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content('<!doctype html><div id="board" class="jxgbox" style="width:600px;height:380px"></div>')
        page.add_style_tag(path=str(css))
        page.add_script_tag(path=str(js))
        vals=page.evaluate("""() => {
          if(!window.JXG?.JSXGraph)throw Error('real JSXGraph missing');
          const b=JXG.JSXGraph.initBoard('board',{boundingbox:[-1,8,9,-1],axis:false,
             showNavigation:false,showCopyright:false,renderer:'svg',point:{size:0}});
          const a=b.create('point',[0,0],{size:0,name:'A'});
          const c=b.create('point',[6,0],{size:0,name:'B'});
          b.create('segment',[a,c],{strokeColor:'#000000'});
          b.update();
          const g=document.querySelector('#board');
          return {svg:!!g.querySelector('svg'),paths:g.querySelectorAll('path,line,polyline').length,
                  size0:Number(a.visProp.size)===0&&Number(c.visProp.size)===0};
        }""")
        report['measurements']=vals
        page.locator('#board').screenshot(path=str(out/'jsxgraph_smoke.png'))
        report['errors']=errors
        report['status']='PASS' if vals['svg'] and vals['paths']>0 and vals['size0'] and not errors else 'FAIL'
        browser.close()
except Exception as e:
    report['status']='FAIL'
    report['errors'].append(str(e))
finish(0 if report['status']=='PASS' else 1)
