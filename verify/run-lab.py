# One full run on the lab (8785, all channels simulated) for the run-page screenshots.
import json,urllib.request,time,sys
S='http://127.0.0.1:8785/api'
def req(u,b=None):
  r=urllib.request.Request(S+u,data=None if b is None else json.dumps(b).encode(),headers={'content-type':'application/json'},method='POST' if b is not None else 'GET')
  return json.loads(urllib.request.urlopen(r,timeout=120).read())
req('/reset',{})
t=sys.argv[1] if len(sys.argv)>1 else 'Need a 10-ton truck from Hyderabad to Pune on Friday'
c=req('/check',{'text':t,'skus':[]}); r=req('/runs',{'text':t,'skus':[],'enquiry':c['ask']['enquiry']})
for i in range(90):
  x=req(f"/runs/{r['id']}")
  if x['summary'] and x['summary']['basedOn']>=sum(1 for o in x['suppliers'] if o['replies']) and all(o['replies'] for o in x['suppliers'] if o['letter']!='D'): break
  time.sleep(2)
print(x['id'], x['summary']['parser'], x['summary']['best'])
