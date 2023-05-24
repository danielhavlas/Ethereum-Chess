import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {BrowserRouter,HashRouter} from 'react-router-dom'

import { WagmiConfig, createClient, configureChains } from 'wagmi'
import { arbitrumGoerli} from 'wagmi/chains'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import { publicProvider } from 'wagmi/providers/public'
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'

import { UserContextProvider } from './context/UserContext';
import { RoomContextProvider } from './context/RoomContext';
import { ContractContextProvider } from './context/ContractContext';
import { LoadingContextProvider } from './context/LoadingContext';

const {chains, provider, webSocketProvider } = configureChains(
    [arbitrumGoerli],
    [alchemyProvider({apiKey: '5wrF8GfHv4OkRu88nUwwDKYr42djfeNU'}), publicProvider()]

)

const client = createClient({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({chains}),
    new CoinbaseWalletConnector({
        chains,
        options: {
          appName: 'wagmi',
        },
      }),
      new WalletConnectConnector({chains}),
      new InjectedConnector({
        chains,
        options: {
          name: 'Injected',
          shimDisconnect: true,
        },
      }),
    ],
    provider,
    webSocketProvider
})

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <BrowserRouter basename='/'>
        <WagmiConfig client={client}>
            <UserContextProvider>
                <ContractContextProvider>
                    <RoomContextProvider>
                        <LoadingContextProvider>
                            <App />
                        </LoadingContextProvider>
                    </RoomContextProvider>
                </ContractContextProvider>
            </UserContextProvider>
        </WagmiConfig>
    </BrowserRouter>
);

