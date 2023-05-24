import { Children } from "react"
import { inCheck, tempChess } from "../utils/Game"
export default function Square({children, black,highlightThisPosition, promotion, turn}){


    const bg = black? 'square-black' : 'square-white'
    const highlightE =  <div className="highlight-dot"></div>
    const captureHighlight = children && !promotion? highlightThisPosition && Children.count(children) === 1 && children.props.piece.color !== turn : ''
    const checkHighlight = inCheck() && children && children.props.piece?.color === turn && turn === tempChess.turn() && children.props.piece?.type === 'k'
    return(
        <div className={`board-square ${bg} ${(checkHighlight || captureHighlight) && 'highlight'}`}>
             {children}
             {Children.count(children) === 0 && highlightThisPosition && highlightE}
        </div>
    )
}