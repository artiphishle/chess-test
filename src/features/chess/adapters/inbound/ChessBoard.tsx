'use client';

import type { Cell, Position } from '../../../../types/chess.ts';

const glyphs:Readonly<Record<string,string>>={
  wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',
  bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟',
};

type Props={
  cells:readonly (readonly Cell[])[];
  width:number;
  height:number;
  flipped?:boolean;
  selected?:Position|null;
  hints?:readonly Position[];
  disabled?:boolean;
  onSquare:(position:Position)=>void;
};

/*** Render rectangular interactive boards with accessible squares and orientation. */
export function ChessBoard({cells,width,height,flipped=false,selected=null,hints=[],disabled=false,onSquare}:Props){
  const ranks=Array.from({length:height},(_,i)=>flipped?height-1-i:i);
  const files=Array.from({length:width},(_,i)=>flipped?width-1-i:i);
  return <div className="board-scroll"><div className="chess-board" role="grid" aria-label={`${width} mal ${height} Schachbrett`}
    style={{gridTemplateColumns:`repeat(${width}, minmax(0, 1fr))`,width:`max(100%, ${width*36}px)`,maxWidth:`${width*68}px`}}>
    {ranks.flatMap(y=>files.map(x=>{
      const cell=cells[y]?.[x]??null;
      const active=selected?.x===x&&selected.y===y;
      const legal=hints.some(point=>point.x===x&&point.y===y);
      const label=cell?.kind==='coin'?`Choice Coin ${cell.options.join('/')}`:cell?`${cell.color==='w'?'Weiss':'Schwarz'} ${cell.kind}`:'leer';
      return <button key={`${x}:${y}`} className={`square ${(x+y)%2===0?'light':'dark'}${active?' selected':''}${legal?' legal':''}`}
        type="button" aria-label={`Feld ${x+1},${y+1}: ${label}`} aria-pressed={active}
        onClick={()=>onSquare({x,y})} disabled={disabled}>
        {cell?.kind==='coin'?<span className="coin" title={cell.options.join('/')}>C</span>:cell?<span className={`chess-piece ${cell.color==='w'?'white-piece':'black-piece'}`}>{glyphs[cell.color+cell.kind]}</span>:null}
        {legal?<span className="legal-dot"/>:null}
      </button>;
    }))}
  </div></div>;
}
