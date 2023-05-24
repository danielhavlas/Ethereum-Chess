export type room = {
    status: string,
    players: player[],
    roomNumber: string,
    wager: string,
    game: game | gameSub,
    creator?: string,
    second?: string
}

export type player = {
    id: string,
    color: string,
    wallet: string,
    locked: boolean,
    joinedAt: any,
    gameTimeLeft: number
}
export type game = {
    gameData: string,
    pendingPromotion: chessMove | null,
    gameOver: boolean,
    winner: string
    startTime: any,
    endTime?: any,
    result: string,
    reason: string
}

export type gameSub = game & {
    board: [],
    turn: string,
}

export type chessMove = {
    to: string,
    from: string,
    color?: string
    promotion?: string
}

export type wagers = {
    low: string,
    medium: string, 
    high: string
}

export type group = 'group_1' | 'group_2' | 'group_3' | 'public' | 'private'
