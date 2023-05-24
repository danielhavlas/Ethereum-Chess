import { useContext } from "react";
import { RoomContext } from "../../../context/RoomContext";
import { handleMove, tempChess } from "../utils/Game";

import Square from "./Square"
const promotionPieces =  ['r', 'n', 'b', 'q']

export default function Promotion({promotion: {from, to, color}}) {

    const {group, roomNumber} = useContext(RoomContext)

    return (
        <div className="board">
            {promotionPieces.map((p,i) => (
                <div key={i} className="promote-square">
                    <Square black={i%3===0}>
                        <div onClick={() => {
                            handleMove(group, roomNumber, from, to, p)
                            tempChess.move({from, to, p})
                            }} >
                            <img src={require(`../svgs/${p}-${color}.svg`)} alt="" className="piece" />
                        </div>
                    </Square>
                </div>
            ))}
        </div>
    )
}