import { User } from 'firebase/auth'
import React, {useState, createContext, SetStateAction, Dispatch} from 'react'

type context = {
    user: User | null,
    setUser: Dispatch<SetStateAction<User | null>>
}

type props = {
    children: React.ReactNode
}

export const UserContext = createContext<context>({} as context) 

export const UserContextProvider = ({children}: props) => {
    const [user, setUser] = useState<User | null>(null)

    return (
        <UserContext.Provider value={{user,setUser}}>
            {children}
        </UserContext.Provider>
    )
}
