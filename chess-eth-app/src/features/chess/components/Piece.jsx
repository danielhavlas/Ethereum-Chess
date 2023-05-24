import { useState, useEffect } from "react";
export default function Piece ({piece: {type, color}, position, yourColor, turn, selectPiece}){
    function selectThisPiece() {
        if (color === yourColor && turn === yourColor) {
            selectPiece(position)
        }
    }
    const [pieceImg, setPieceImg] = useState()
    
    useEffect(() => {
        if(!type || !color) return;
        setPieceImg(require(`../svgs/${type}-${color}.svg`))
        
    }, [type, color]);
    return(
        <div className="piece-container" onClick={selectThisPiece}>
            <img src={pieceImg} alt="" className="piece" />
        </div>
    )
}