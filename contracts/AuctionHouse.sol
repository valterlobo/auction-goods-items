// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/***
 * @TODO
 *   1 - Contract  Withdraw
 *   2  - Transfer  -ok
 * https://etherscan.io/address/0x830bd73e4184cef73443c15111a1df14e495c706#writeProxyContract
 * https://etherscan.io/address/0xf15a943787014461d94da08ad4040f79cd7c124e#code
 * https://nouns.wtf/noun/654
 *
 */

contract AuctionHouse is Ownable, ReentrancyGuard {
    event AuctionCreated(
        uint256 indexed id,
        uint256 startTime,
        uint256 endTime
    );
    event AuctionBid(address indexed sender, uint auction, uint amount);
    event AuctionEnded(uint auction, address winner, uint amount);

    struct AuctionItem {
        uint256 id;
        string name;
        string description;
        uint codItem;
        address seller;
        uint256 sellerMinBid;
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

    mapping(uint => Bid[]) public auctionsBids; // id actions -> bids

    /*constructor() public {
        auctions[0] = AuctionItem(
            0,
            "name",
            "description",
            0,
            address(0),
            0,
            address(0),
            0,
            true,
            false,
            0,
            0
        );
        auctionsBids[0][0] = Bid(0, address(0), 0, 0);
    }*/

    function startAuction(
        uint256 id,
        string memory name,
        string memory description,
        uint codItem,
        address seller,
        uint256 sellerMinBid,
        uint startAt,
        uint endAt
    ) external onlyOwner {
        AuctionItem storage auctionItem = auctions[id];
        require(auctionItem.codItem == 0, "AuctionItem EXIST [ID]");
        require(
            startAt < endAt,
            "AuctionItem endAt must be greater than the startAt"
        );

        auctions[id] = AuctionItem(
            id,
            name,
            description,
            codItem,
            seller,
            sellerMinBid,
            address(0),
            0,
            true,
            false,
            startAt,
            endAt
        );

        emit AuctionCreated(id, startAt, endAt);
    }

    function bidAuction(uint256 auctionID) external payable nonReentrant {
        AuctionItem storage auctionItem = auctions[auctionID];
        require(auctionItem.codItem != 0, "AuctionItem NOT EXIST [ID]");
        require(
            auctionItem.sellerMinBid < msg.value,
            "Value not accepted - must be greater than the minimum bid"
        );

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
