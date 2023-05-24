/*SPDX-License-Identifier: UNLICENSED*/
pragma solidity 0.8.19;

contract ChessEth {
    address payable public owner;
    uint256 feeRate = 10;

    constructor() {
        owner = payable(msg.sender);
    }

    mapping(address => uint256) public lockedTokensOfAddress;
    mapping(address => uint256) private loseCodeOfAddress;
    mapping(address => uint256) private drawCodeOfAddress;
    mapping(address => bool) public inGame;

    function lockTokens(
        uint256 _loseCode,
        uint256 _drawCode,
        uint256 _wager
    ) public payable {
        require(
            (lockedTokensOfAddress[msg.sender] + msg.value) >=
                (_wager * 9) / 10,
            "Not sent enough"
        );
        uint256 value = msg.value;
        if (value != 0) {
            uint256 fees = value / feeRate;
            value -= fees;
            owner.transfer(fees);
        }
        if (_wager < lockedTokensOfAddress[msg.sender]) {
            uint256 sendBack = lockedTokensOfAddress[msg.sender] - _wager;
            lockedTokensOfAddress[msg.sender] -= sendBack;
            payable(msg.sender).transfer(sendBack);
        }
        lockedTokensOfAddress[msg.sender] += value;
        if (!inGame[msg.sender]) {
            loseCodeOfAddress[msg.sender] = _loseCode;
            drawCodeOfAddress[msg.sender] = _drawCode;
        }
        inGame[msg.sender] = true;
    }

    function claimTokens(
        address _winner,
        address _loser,
        uint256 _loserCode
    ) public {
        require(_winner == msg.sender, "Not winner");
        require(_loserCode == loseCodeOfAddress[_loser], "Incorrect code");
        inGame[_winner] = false;
        inGame[_loser] = false;
        uint256 winnings = lockedTokensOfAddress[_winner] +
            lockedTokensOfAddress[_loser];
        lockedTokensOfAddress[_winner] = 0;
        lockedTokensOfAddress[_loser] = 0;
        (bool success, ) = msg.sender.call{value: winnings}("");
        require(success, "Failed to send ether");
    }

    function withdrawTokens(address _opponent, uint256 _code) public {
        require(_code == drawCodeOfAddress[_opponent], "Incorrect draw code");
        payable(msg.sender).transfer(lockedTokensOfAddress[msg.sender]);
        inGame[msg.sender] = false;
    }

    function getCodes(address wallet) public view returns (uint256, uint256) {
        require(msg.sender == owner);
        return (loseCodeOfAddress[wallet], drawCodeOfAddress[wallet]);
    }

    function updateOwner(address payable _newOwner) public {
        require(msg.sender == owner);
        owner = _newOwner;
    }

    function changeFees(uint256 _newFees) public {
        require(msg.sender == owner && _newFees >= 10 && _newFees <= 100);
        feeRate = _newFees;
    }
}
