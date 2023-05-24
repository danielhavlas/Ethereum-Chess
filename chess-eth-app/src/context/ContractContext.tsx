import React, {useState, createContext, SetStateAction, Dispatch} from 'react'
import {ethers} from 'ethers'
type context = {
    contract: ethers.Contract | null,
    setContract: Dispatch<SetStateAction<ethers.Contract | null>>
}

type props = {
    children: React.ReactNode
}

export const ContractContext = createContext<context>({} as context) 

export const ContractContextProvider = ({children}: props) => {
    const [contract, setContract] = useState<ethers.Contract | null>(null)

    return (
        <ContractContext.Provider value={{contract,setContract}}>
            {children}
        </ContractContext.Provider>
    )
}
