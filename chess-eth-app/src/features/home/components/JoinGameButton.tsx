import knight_w from '../../chess/svgs/n-w.svg'
import knight_b from '../../chess/svgs/n-b.svg'
import pawn_w from '../../chess/svgs/p-w.svg'
import pawn_b from '../../chess/svgs/p-b.svg'
import queen_w from '../../chess/svgs/q-w.svg'
import queen_b from '../../chess/svgs/q-b.svg'

import rook_w from '../../chess/svgs/r-b.svg'
import bishop_w from '../../chess/svgs/b-w.svg'


type props = {
    wager: string;
    group: string;
    findMatch: (arg0: string, arg1: string) => {};
    piece: string;
};

export function JoinGameButton({ wager, group, findMatch, piece }: props) {
    console.log(piece);
    
    let piece_w = piece === 'p'? pawn_w : piece === 'n' ? knight_w : piece === 'q' ? queen_w : null
    let piece_b = piece === 'p'? pawn_b : piece === 'n' ? knight_b : piece === 'q' ? queen_b : null
    return (
        <button
            className="button join-game--button"
            onClick={() => findMatch(wager, group)}
        >
            <div className="logo">
                <img src={piece_w} alt="" />
                <img src={piece_b} alt="" />
            </div>
            <p className="fs-4 bold">
                Win {(parseFloat(wager) * 1.8).toFixed(3)} ETH
            </p>
            <p className="fs-5">Bet {wager} ETH</p>
        </button>
    );
}

export function CustomGameButton({showCustomGame}: {showCustomGame: () => void}) {
    return (
        <button
            className="button join-game--button"
            onClick={showCustomGame}
        >
            <div className="logo">
                <img src={rook_w} alt="" />
                <img src={bishop_w} alt="" />
            </div>
            <p className="fs-4 bold">Custom game</p>
        </button>
    );
}

