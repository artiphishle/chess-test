'use client';

import { Button } from '@ankhorage/zora/web/button';
import { useState } from 'react';
import type { Cell, Color, PieceKind, Position, Template } from '../../../../types/chess.ts';
import { ChessBoard } from '../../../chess/adapters/inbound/ChessBoard.tsx';
import { createPresets } from '../../domain/createPresets.ts';

const pieceKinds:readonly PieceKind[]=['P','N','B','R','Q','K'];
const coins:Readonly<Record<string,readonly PieceKind[]>>={
  'Knight / Bishop':['N','B'], 'Free':['P','N','B','R','Q','K'],
  'Minor':['N','B'], 'Major':['R','Q'], 'Promotion':['N','B','R','Q'],
};
type Palette=Readonly<{type:'erase'}|{type:'piece';color:Color;kind:PieceKind}|{type:'coin';color:Color;options:readonly PieceKind[]}>;
type Props={
  template:Template;
  templates:readonly Template[];
  onSelect:(template:Template)=>void;
  onUpdate:(template:Template)=>void;
  onSave:(name:string)=>void;
  onDelete:(id:string)=>void;
};

/*** Edit freely placed pieces and extensible choice coins, and save local reusable templates. */
export function TemplateEditor({template,templates,onSelect,onUpdate,onSave,onDelete}:Props){
  const [name,setName]=useState(template.name);
  const [color,setColor]=useState<Color>('w');
  const [palette,setPalette]=useState<Palette>({type:'piece',color:'w',kind:'P'});
  const [custom,setCustom]=useState<readonly PieceKind[]>(['N','B']);
  const [coinPreset,setCoinPreset]=useState('Knight / Bishop');
  const resize=(width:number,height:number)=>{
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width>32||height>32)return;
    onUpdate({...template,width,height,cells:Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>template.cells[y]?.[x]??null))});
  };
  const place=({x,y}:Position)=>{
    const cell:Cell=palette.type==='erase'?null:palette.type==='coin'
      ?{kind:'coin',color:palette.color,options:[...palette.options]}:{kind:palette.kind,color:palette.color};
    onUpdate({...template,cells:template.cells.map((row,rank)=>rank===y?row.map((existing,file)=>file===x?cell:existing):[...row])});
  };
  const pickCoin=(preset:string,options:readonly PieceKind[])=>{
    if(options.length===0)return;
    setCoinPreset(preset);
    setPalette({type:'coin',color,options});
  };
  return <div className="editor-layout">
    <section className="panel editor-controls">
      <h2>Konfiguration</h2>
      <label className="field-label">Vorlage
        <select value={templates.some(entry=>entry.id===template.id)?template.id:''} onChange={event=>{
          const selected=templates.find(entry=>entry.id===event.target.value);
          if(selected){setName(selected.name);onSelect(selected);}
        }}><option value="" disabled>Eigene Änderungen</option>{templates.map(entry=><option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>
      </label>
      <div className="pair">
        <label className="field-label">Breite<input type="number" min={2} max={32} value={template.width} onChange={event=>resize(Number(event.target.value),template.height)}/></label>
        <label className="field-label">Höhe<input type="number" min={2} max={32} value={template.height} onChange={event=>resize(template.width,Number(event.target.value))}/></label>
      </div>
      <label className="field-label">Zugbeginn
        <select value={template.turn} onChange={event=>onUpdate({...template,turn:event.target.value as Color})}>
          <option value="w">Weiss</option><option value="b">Schwarz</option>
        </select>
      </label>
      <div className="section-separator"/>
      <h3>Figuren setzen</h3>
      <div className="segmented">
        <button type="button" aria-pressed={color==='w'} onClick={()=>{setColor('w');setPalette(p=>p.type==='erase'?p:{...p,color:'w'});}}>Weiss</button>
        <button type="button" aria-pressed={color==='b'} onClick={()=>{setColor('b');setPalette(p=>p.type==='erase'?p:{...p,color:'b'});}}>Schwarz</button>
      </div>
      <div className="palette">
        {pieceKinds.map(kind=><button type="button" key={kind} className={palette.type==='piece'&&palette.color===color&&palette.kind===kind?'active':''}
          onClick={()=>setPalette({type:'piece',kind,color})} aria-label={`Setze ${kind}`}>{kind}</button>)}
        <button type="button" className={palette.type==='erase'?'active':''} onClick={()=>setPalette({type:'erase'})}>×</button>
      </div>
      <h3>Choice Coins</h3>
      <div className="chip-group">{Object.entries(coins).map(([preset,options])=><button type="button" key={preset}
        className={palette.type==='coin'&&coinPreset===preset?'active':''} onClick={()=>pickCoin(preset,options)}>{preset}</button>)}
        <button type="button" className={palette.type==='coin'&&coinPreset==='Custom'?'active':''}
          onClick={()=>pickCoin('Custom',custom)}>Custom</button>
      </div>
      <div className="custom-options" aria-label="Custom Coin Figuren">{pieceKinds.map(kind=><label key={kind}>
        <input type="checkbox" checked={custom.includes(kind)} onChange={event=>{
          const options=event.target.checked?[...custom,kind]:custom.filter(item=>item!==kind);
          if(!options.length)return;
          setCustom(options);
          if(coinPreset==='Custom') setPalette({type:'coin',color,options});
        }}/>{kind}</label>)}</div>
      <div className="section-separator"/>
      <label className="field-label">Name der Vorlage<input value={name} maxLength={100} onChange={event=>setName(event.target.value)}/></label>
      <div className="action-row"><Button onPress={()=>onSave(name.trim()||'Eigene Vorlage')}>Vorlage speichern</Button>
        <Button variant="outline" onPress={()=>{const blank:Template={id:'new',name:'Neue Vorlage',width:template.width,height:template.height,turn:'w',cells:Array.from({length:template.height},()=>Array<Cell>(template.width).fill(null))};setName(blank.name);onSelect(blank);}}>Leeres Brett</Button></div>
      {!createPresets().some(p=>p.id===template.id)&&template.id!=='new'?<Button variant="ghost" onPress={()=>onDelete(template.id)}>Eigene Vorlage löschen</Button>:null}
    </section>
    <section className="panel board-panel"><div className="panel-heading"><h2>Startaufstellung</h2><span>{template.width} × {template.height}</span></div>
      <ChessBoard cells={template.cells} width={template.width} height={template.height} onSquare={place}/>
      <p className="muted">Feld anklicken, um die gewählte Figur oder einen Coin zu setzen. Jede Seite darf eigene Positionen und beliebige Figuren haben.</p>
    </section>
  </div>;
}
