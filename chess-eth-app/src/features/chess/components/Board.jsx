import React, {useState, useEffect} from "react";
import BoardSquare from "./BoardSquare";
import { getLegalPositions, tempChess } from "../utils/Game";


export default function Board({board, turn, yourColor}) {

    const [currBoard, setCurrBoard] = useState([])
    const [selectedPiece, setSelectedPiece] = useState()
    const [legalMoves, setLegalMoves] = useState()

    

    useEffect(() => {
        setCurrBoard(
          yourColor === 'w' ? board.flat() : board.flat().reverse()
        )
      }, [board])

      useEffect(() => {
        if(!tempChess.board()) return;
        setCurrBoard(yourColor === 'w' ? tempChess.board().flat() : tempChess.board().flat().reverse())
    }, [selectedPiece]);

    function clearSelectedPiece() {
        setSelectedPiece(null)
        setLegalMoves(null)
    }


    function getXYPosition(i) {
        const x = turn === 'w' ? i % 8 : Math.abs((i % 8) - 7)
        const y =
          turn === 'w'
            ? Math.abs(Math.floor(i / 8) - 7)
            : Math.floor(i / 8)
        return { x, y }
      }

    function isBlack(i) {
        const {x,y} = getXYPosition(i)
        return (x+y) % 2 === 1
    }

    function getPosition(i) {
        const {x,y} = getXYPosition(i)
        const letter = ['a','b','c','d','e','f','g','h'][x]
        return `${letter}${y+1}`
    }

    function selectPiece(position) {
        setSelectedPiece(position)
        setLegalMoves(getLegalPositions().filter(m => m.from === position))
    }


    return(
        <div className="board">
        {currBoard.map((piece, i) => {
            return(
                <div key={i} className='square'>
                    <BoardSquare piece={piece} black={isBlack(i)} position={getPosition(i)} yourColor={yourColor} selectPiece={selectPiece} clearSelectedPiece={clearSelectedPiece} selectedPiece={selectedPiece} legalMoves={legalMoves} turn={turn} />
                </div>
            )
        })}
        </div>
    )
}