import { useContext } from "react";
import { RoomContext } from "../../../context/RoomContext";
import Square from "./Square"
import Piece from "./Piece"
import Promotion from "./Promotion"
import { useEffect, useState } from "react"
import { gameSubject, handleMove, tempChess } from "../utils/Game";

export default function BoardSquare({piece, black, position, yourColor, selectPiece, legalMoves, selectedPiece, clearSelectedPiece, turn}) {
    const [highlighThisPosition, setHighlightThisPosition] = useState(false)
    const [promotion, setPromotion] = useState(null)
    const [gameOver, setGameOver] = useState(false)
    const {group, roomNumber} = useContext(RoomContext)

    useEffect(() => {
        setHighlightThisPosition(highlightPosition())
    },[legalMoves])

    useEffect(() => {
        if(!gameSubject)return;
        const subscribe = gameSubject.subscribe(room => {
            if(!room) return
            const {game: {pendingPromotion, gameOver}} = room
            if(gameOver) setGameOver(gameOver);
            pendingPromotion && pendingPromotion.to === position? setPromotion(pendingPromotion) : setPromotion(null)
        })
        return () => subscribe.unsubscribe()
    },[position])

    const highlightPosition = () => {
        if(legalMoves){
            return legalMoves.map(v => v.to).includes(position)
        }
        else{
            return false
        }
    } 
    function moveToHere() {
        if(highlighThisPosition && selectedPiece !== position && !gameOver){
            handleMove(group, roomNumber, selectedPiece,position)
            clearSelectedPiece()
            const b = tempChess.move({from: selectedPiece, to: position})
            const f = tempChess.fen()
            tempChess.load(f)
        }
    }
    return(
        <div className="board-square" onClick={moveToHere}>
            <Square black={black} highlightThisPosition={highlighThisPosition} highlightOpp={true} yourColor={yourColor} promotion={promotion} turn={turn}>
                {promotion? <Promotion promotion={promotion} /> : piece ? <Piece piece={piece} position={position} yourColor={yourColor} clearSelectedPiece={clearSelectedPiece} selectedPiece={selectedPiece} turn={turn} selectPiece={selectPiece}  /> : null}
            </Square>
        </div>
    )

}