const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("GameItemAuction", function () {
    async function deployContract() {
        const [owner, sellerAccount, birdAccount] = await ethers.getSigners();

        const AuctionHouse = await ethers.getContractFactory(
            "GameItemAuction"
        );

        const auctionHouse = await AuctionHouse.deploy();

        return { auctionHouse, owner, sellerAccount, birdAccount };
    }

    describe("Deployment", function () {

        it("Check  owner", async function () {

            const { auctionHouse, owner, sellerAccount, birdAccount } = await loadFixture(deployContract)
            expect(await auctionHouse.owner()).to.equal(owner.address)

        });

    });


    describe("startAuction", function () {

        it("startAuction", async function () {

            const { auctionHouse, owner, sellerAccount, birdAccount } = await loadFixture(deployContract)

            await auctionHouse.startAuction(10, sellerAccount.address, 0, 1)
            let auctionInfo = await auctionHouse.getAuction(1)

            expect(auctionInfo[0]).to.equal(1)
            expect(auctionInfo[1]).to.equal(10)
            expect(auctionInfo[2]).to.equal(sellerAccount.address)
        });

    });



    describe("bidAuction", function () {

        it("bidAuction", async function () {

            const { auctionHouse, owner, sellerAccount, birdAccount } = await loadFixture(deployContract)

            await auctionHouse.startAuction(10, sellerAccount.address, 0, 1)

            let birdValueItem = ethers.utils.parseEther("0.0012");

            let provider = ethers.provider

            let birdBalanceBefore = await provider.getBalance(birdAccount.address)


            const txBird = await auctionHouse.connect(birdAccount).bidAuction(1, {
                value: birdValueItem,
            })

            let birdBalanceAfter = await provider.getBalance(birdAccount.address)
            const txReceipt = await provider.getTransactionReceipt(txBird.hash)
            const gasUsedETH = txReceipt.effectiveGasPrice * txReceipt.gasUsed;
            const vlBirdBalance1 = birdBalanceBefore.sub(ethers.BigNumber.from(gasUsedETH)).sub(birdValueItem)

            expect(vlBirdBalance1).to.equal(birdBalanceAfter)



            //bird owner 
            let birdNewValueItem = ethers.utils.parseEther("0.0014");

            await auctionHouse.connect(owner).bidAuction(1, {
                value: birdNewValueItem,
            })
            // new balance bird account 
            let birdAccountBalance = await provider.getBalance(birdAccount.address)
            //console.log(birdAccountBalance)
            //console.log(birdBalanceBefore.sub(ethers.BigNumber.from(gasUsedETH)))
            expect(birdAccountBalance).to.equal(birdBalanceBefore.sub(ethers.BigNumber.from(gasUsedETH)))

            let lastAuctionItem = await auctionHouse.connect(owner).getAuction(1)
            //console.log("------")
            //console.log(lastAuctionItem)
            expect(lastAuctionItem[4]).to.equal(owner.address)
            expect(lastAuctionItem[5]).to.equal(birdNewValueItem)

        });

        it("bidAuction - AuctionItem NOT EXIST [ID]", async function () {

            const { auctionHouse, owner, sellerAccount, birdAccount } = await loadFixture(deployContract)

            let valueItem = ethers.utils.parseEther("0.001");
            await auctionHouse.startAuction(10, sellerAccount.address, 0, 1)

            await expect(
                auctionHouse.connect(birdAccount).bidAuction(10, {
                    value: valueItem,
                })
            ).to.be.revertedWith("AuctionItem NOT EXIST [ID]")

        });



        it("bidAuction - Value not accepted - must be greater than the  last bid", async function () {

            const { auctionHouse, owner, sellerAccount, birdAccount } = await loadFixture(deployContract)

            let valueItem = ethers.utils.parseEther("0.001");

            await auctionHouse.startAuction(10, sellerAccount.address, 0, 1)

            let birdValueItem = ethers.utils.parseEther("0.0012");


            auctionHouse.bidAuction(1, {
                value: birdValueItem,
            })


            await expect(
                auctionHouse.connect(birdAccount).bidAuction(1, {
                    value: birdValueItem,
                })
            ).to.be.revertedWith("Value not accepted - must be greater than the last bid")

        });

        it("bidAuction - Auction already ended", async function () {

            const { auctionHouse, owner, sellerAccount, birdAccount } = await loadFixture(deployContract)

            await auctionHouse.startAuction(10, sellerAccount.address, 0, 1)

            let birdValueItem = ethers.utils.parseEther("0.0012");

            var dateOffset = (24 * 60 * 60 * 1000) * 1 //1 days
            let t = await time.latest()
            let newTimestamp = t + dateOffset
            await time.increaseTo(newTimestamp)

            await expect(
                auctionHouse.connect(birdAccount).bidAuction(1, {
                    value: birdValueItem,
                })
            ).to.be.revertedWith("Auction already ended")

        });

    });



    describe("endAuction", function () {

        it("endAuction", async function () {

            const { auctionHouse, owner, sellerAccount, birdAccount } = await loadFixture(deployContract)


            let valueItem = ethers.utils.parseEther("0.001");
            let t = await time.latest()
            var dateOffset = (24 * 60 * 60 * 1000) * 1 //1 days


            await auctionHouse.startAuction(10, sellerAccount.address, 0, 1)

            let birdValueItem = ethers.utils.parseEther("0.0012");

            const txBird = await auctionHouse.connect(birdAccount).bidAuction(1, {
                value: birdValueItem,
            })


            //bird owner 
            let birdNewValueItem = ethers.utils.parseEther("0.0014");

            await auctionHouse.connect(owner).bidAuction(1, {
                value: birdNewValueItem,
            })

            await expect(
                auctionHouse.connect(owner).endAuction(1)
            ).to.be.revertedWith("Auction NOT already ended")

            let newTimestamp = t + dateOffset
            await time.increaseTo(newTimestamp)

            let provider = ethers.provider

            let lastAuctionItem = await auctionHouse.connect(owner).getAuction(1)

            let sellerBalanceBefore = await provider.getBalance(lastAuctionItem[2])

            await auctionHouse.connect(owner).endAuction(1)


            lastAuctionItem = await auctionHouse.connect(owner).getAuction(1)
            //console.log("------")
            let lastTime = await time.latest()
            //console.log("----------------")
            //console.log(lastAuctionItem)
            expect(lastAuctionItem[4]).to.equal(owner.address)
            expect(lastAuctionItem[5]).to.equal(birdNewValueItem)
            expect(lastAuctionItem[7]).to.equal(true)
            expect(lastAuctionItem[9]).to.equal(lastTime)

            let sellerBalanceAfter = await provider.getBalance(lastAuctionItem[2])
            expect(sellerBalanceAfter).to.equal(sellerBalanceBefore.add(lastAuctionItem[5]))
        });

    });


    describe("getBid", function () {

        it("getBid - not exist ", async function () {

            const { auctionHouse, owner, otherAccount } = await loadFixture(deployContract)

            let bids = await auctionHouse.connect(owner).getBid(1)
            //console.log(bids)


        });

    });



});