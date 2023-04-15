// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract GameItemAuction is Ownable, ReentrancyGuard {
    event AuctionCreated(
        uint256 indexed id,
        uint256 startTime,
        uint256 endTime
    );
    event AuctionBid(address indexed sender, uint auction, uint amount);
    event AuctionEnded(uint auction, address winner, uint amount);

    struct AuctionItem {
        uint256 id;
        uint codItem;
        address seller;
        uint256 incrementBidAmount;
        address winnerBuyBid;
        uint256 winnerAmountBid;
        bool started;
        bool ended;
        uint startAt;
        uint endAt;
    }

    struct Bid {
        uint256 auction;
        address sender;
        uint value;
        uint time;
    }

    mapping(uint => AuctionItem) public auctions;

    mapping(uint => Bid[]) public auctionsBids; //id actions -> bids

    using Counters for Counters.Counter;
    Counters.Counter private counterIds;

    function startAuction(
        uint codItem,
        address seller,
        uint256 incrementBidAmount,
        uint qtdDays
    ) external onlyOwner returns (uint256) {
        require(qtdDays > 0, "AuctionItem qtdDays must be greater than zero");

        counterIds.increment();
        uint256 newID = counterIds.current();

        uint startAt = block.timestamp;
        uint endAt = startAt + qtdDays * 1 days;

        auctions[newID] = AuctionItem(
            newID,
            codItem,
            seller,
            incrementBidAmount,
            address(0),
            0,
            true,
            false,
            startAt,
            endAt
        );

        emit AuctionCreated(newID, startAt, endAt);

        return newID;
    }

    function bidAuction(uint256 auctionID) external payable nonReentrant {
        AuctionItem storage auctionItem = auctions[auctionID];
        require(auctionItem.codItem != 0, "AuctionItem NOT EXIST [ID]");

        require(
            auctionItem.winnerAmountBid < msg.value,
            "Value not accepted - must be greater than the last bid"
        );
        require(block.timestamp < auctionItem.endAt, "Auction already ended");
        require(!auctionItem.ended, "Auction already ended - value");

        if (
            auctionItem.winnerBuyBid != address(0) &&
            auctionItem.winnerAmountBid < msg.value
        ) {
            address payable payTo = payable(auctionItem.winnerBuyBid);
            payTo.transfer(auctionItem.winnerAmountBid);

            /* (bool success, ) = payTo.call{value: auctionItem.winnerAmountBid}(
                ""
            );
            require(success, "Failed to transfer bird");*/
        }

        //set values
        auctionItem.winnerBuyBid = msg.sender;
        auctionItem.winnerAmountBid = msg.value;

        Bid[] storage bids = auctionsBids[auctionID];
        Bid memory bid = Bid(auctionID, msg.sender, msg.value, block.timestamp);
        bids.push(bid);

        emit AuctionBid(msg.sender, auctionID, msg.value);
    }

    function getAuction(
        uint auctionID
    ) external view returns (AuctionItem memory) {
        AuctionItem memory auctionItem = auctions[auctionID];

        return auctionItem;
    }

    function getBid(uint auctionID) external view returns (Bid[] memory) {
        Bid[] memory bids = auctionsBids[auctionID];
        return bids;
    }

    function endAuction(uint auctionID) external nonReentrant onlyOwner {
        AuctionItem storage auctionItem = auctions[auctionID];
        require(auctionItem.codItem != 0, "AuctionItem NOT EXIST [ID]");
        require(
            block.timestamp > auctionItem.endAt,
            "Auction NOT already ended"
        );

        auctionItem.ended = true;
        auctionItem.endAt = block.timestamp;

        //transfer seller
        address payable payTo = payable(auctionItem.seller);
        payTo.transfer(auctionItem.winnerAmountBid);

        emit AuctionEnded(
            auctionID,
            auctionItem.winnerBuyBid,
            auctionItem.winnerAmountBid
        );
    }
}
