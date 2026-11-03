import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createGameService} from './createGameService.ts';
import {createPresets} from '../../templates/domain/createPresets.ts';
import {validateTemplate} from '../../templates/domain/validateTemplate.ts';

const sessions=()=>{
  let counter=0;
  return createGameService(()=>`test-${++counter}`);
};

test('first two anonymous players pair; next pair gets another game',()=>{
  const service=sessions();
  const presets=createPresets();
  const a=service.join(undefined,presets[0]);
  assert.equal(a.match.phase,'waiting');
  const b=service.join(undefined,presets[2]);
  assert.equal(b.match.color,'b');
  assert.equal(b.match.id,a.match.id);
  assert.equal(b.match.template.id,presets[0]?.id);
  assert.equal(b.match.phase,'playing');
  const c=service.join(undefined,presets[0]);
  assert.notEqual(c.match.id,a.match.id);
});

test('queued template is copied, locked and cannot be modified from another session',()=>{
  const service=sessions();
  const preset=structuredClone(createPresets()[0]!);
  const queued=service.join(undefined,preset);
  (preset.cells as (unknown[])[])[0]![0]=null;
  assert.equal(service.snapshot(queued.token)?.template.cells[0]?.[0]?.kind,'R');
  const rival=service.join(undefined,createPresets()[1]);
  assert.equal(service.snapshot(rival.token)?.template.cells[0]?.[0]?.kind,'R');
  assert.throws(()=>service.execute(queued.token,{action:'choose',x:1,y:0,kind:'N'}),/locked/);
});

test('choice coins are private, independently resolved and immutable after ready',()=>{
  const service=sessions();
  const preset=createPresets()[1]!;
  const a=service.join(undefined,preset);
  const b=service.join(undefined,preset);
  assert.equal(a.match.phase,'waiting');
  assert.equal(b.match.phase,'setup');
  assert.throws(()=>service.execute(a.token,{action:'choose',x:0,y:0,kind:'B'}),/not allowed/);
  assert.throws(()=>service.execute(a.token,{action:'ready'}),/Resolve/);
  for(const [token,color,y,kind] of [[a.token,'w',12,'N'],[b.token,'b',0,'B']] as const){
    for(const x of [1,2,3,6,7,8])service.execute(token,{action:'choose',x,y,kind});
    service.execute(token,{action:'ready'});
    assert.throws(()=>service.execute(token,{action:'choose',x:1,y,kind:'B'}),/locked/);
  }
  const state=service.snapshot(a.token);
  assert.equal(state?.phase,'playing');
  assert.equal(state?.state?.board[12]?.[1]?.kind,'N');
  assert.equal(state?.state?.board[0]?.[1]?.kind,'B');
  assert.equal(state?.template.cells[12]?.[1]?.kind,'coin');
});

test('server blocks moving out of turn, illegal moves, and opponent moves',()=>{
  const service=sessions();
  const a=service.join(undefined,createPresets()[0]);
  const b=service.join(undefined,createPresets()[0]);
  assert.throws(()=>service.execute(b.token,{action:'move',move:{from:{x:4,y:1},to:{x:4,y:3}}}),/Not your turn/);
  assert.throws(()=>service.execute(a.token,{action:'move',move:{from:{x:4,y:1},to:{x:4,y:3}}}),/Illegal move/);
  assert.equal(service.execute(a.token,{action:'move',move:{from:{x:4,y:6},to:{x:4,y:4}}})?.state?.turn,'b');
});

test('resignation, rematch and departures enforce match ownership',()=>{
  const service=sessions();
  const a=service.join(undefined,createPresets()[0]);
  const b=service.join(undefined,createPresets()[0]);
  assert.equal(service.execute(a.token,{action:'resign'})?.result?.winner,'b');
  assert.equal(service.execute(a.token,{action:'rematch'})?.phase,'finished');
  assert.equal(service.execute(b.token,{action:'rematch'})?.phase,'playing');
  assert.equal(service.execute(b.token,{action:'leave'}),null);
  assert.equal(service.snapshot(a.token)?.result?.winner,'w');
  assert.throws(()=>service.execute(b.token,{action:'resign'}),/No active session/);
});

test('validate rejects malformed boards and forbidden coin choice values',()=>{
  assert.throws(()=>validateTemplate({...createPresets()[0],width:33}),/between/);
  const preset=createPresets()[1]!;
  const cells=preset.cells.map(row=>[...row]);
  cells[12]![1]={kind:'coin',color:'w',options:['N','Z' as 'N']};
  assert.throws(()=>validateTemplate({...preset,cells}),/Invalid board/);
});
