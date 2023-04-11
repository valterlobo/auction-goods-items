const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("AuctionHouse", function () {
    async function deployContract() {
        const [owner, sellerAccount, birdAccount] = await ethers.getSigners();

        const AuctionHouse = await ethers.getContractFactory(
            "AuctionHouse"
        );

        const auctionHouse = await AuctionHouse.deploy();

        //await nftSoulboundToken.setListMerkleRoot("0xbb0b9ddf14c5124d3064cbb484774044ec4e68e89dce623395c24a2c669840c2");

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

            let t = await time.latest()
            var dateOffset = (24 * 60 * 60 * 1000) * 5 //5 days

            await auctionHouse.startAuction(1, "BOX", "Auction BOX", 650, sellerAccount.address, 1000, t, t + dateOffset)
            let auctionInfo = await auctionHouse.getAuction(1)
            //console.log(auctionInfo)
            expect(auctionInfo[1]).to.equal('BOX')
            expect(auctionInfo[2]).to.equal('Auction BOX')
            expect(auctionInfo[3]).to.equal(650)
        });

        it("startAuction - AuctionItem EXIST [ID]", async function () {

            const { auctionHouse, owner, sellerAccount, birdAccount } = await loadFixture(deployContract)

            let t = await time.latest()
            var dateOffset = (24 * 60 * 60 * 1000) * 5 //5 days

            await auctionHouse.startAuction(1, "BOX", "Auction BOX", 650, sellerAccount.address, 1000, t, t + dateOffset)

            await expect(
                auctionHouse.startAuction(1, "BOX", "Auction BOX", 650, sellerAccount.address, 1000, t, t + dateOffset)
            ).to.be.revertedWith("AuctionItem EXIST [ID]")

        });

    });



    describe("bidAuction", function () {

        it("bidAuction", async function () {

            const { auctionHouse, owner, sellerAccount, birdAccount } = await loadFixture(deployContract)


            let valueItem = ethers.utils.parseEther("0.001");
            let t = await time.latest()
            var dateOffset = (24 * 60 * 60 * 1000) * 5 //5 days


            await auctionHouse.startAuction(1, "BOX", "Auction BOX", 650, sellerAccount.address, valueItem, t, t + dateOffset)

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
            expect(lastAuctionItem[6]).to.equal(owner.address)
            expect(lastAuctionItem[7]).to.equal(birdNewValueItem)


            /*
            let bids = await auctionHouse.connect(owner).getBid(1)
            console.log(bids)*/



        });

        it("bidAuction - AuctionItem NOT EXIST [ID]", async function () {

            const { auctionHouse, owner, sellerAccount, birdAccount } = await loadFixture(deployContract)


            let valueItem = ethers.utils.parseEther("0.001");

            await auctionHouse.startAuction(1, "BOX", "Auction BOX", 650, sellerAccount.address, valueItem, 1, 2)

            await expect(
                auctionHouse.connect(birdAccount).bidAuction(10, {
                    value: valueItem,
                })
            ).to.be.revertedWith("AuctionItem NOT EXIST [ID]")

        });


        it("bidAuction - Value not accepted - must be greater than the minimum bid", async function () {

            const { auctionHouse, owner, sellerAccount, birdAccount } = await loadFixture(deployContract)


            let valueItem = ethers.utils.parseEther("0.001");

            await auctionHouse.startAuction(1, "BOX", "Auction BOX", 650, sellerAccount.address, valueItem, 1, 2)


            await expect(
                auctionHouse.connect(birdAccount).bidAuction(1, {
                    value: valueItem,
                })
            ).to.be.revertedWith("Value not accepted - must be greater than the minimum bid")

        });



        it("bidAuction - Value not accepted - must be greater than the  last bid", async function () {

            const { auctionHouse, owner, sellerAccount, birdAccount } = await loadFixture(deployContract)

            let valueItem = ethers.utils.parseEther("0.001");
            let t = await time.latest()
            var dateOffset = (24 * 60 * 60 * 1000) * 5 //5 days

            await auctionHouse.startAuction(1, "BOX", "Auction BOX", 650, sellerAccount.address, valueItem, t, t + dateOffset)

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


            let valueItem = ethers.utils.parseEther("0.001");
            let t = await time.latest()
            var dateOffset = (24 * 60 * 60 * 1000) * 5 //5 days


            await auctionHouse.startAuction(1, "BOX", "Auction BOX", 650, sellerAccount.address, valueItem, t - dateOffset, t)

            let birdValueItem = ethers.utils.parseEther("0.0012");


            auctionHouse.bidAuction(1, {
                value: birdValueItem,
            })

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
            var dateOffset = (24 * 60 * 60 * 1000) * 5 //5 days


            await auctionHouse.startAuction(1, "BOX", "Auction BOX", 650, sellerAccount.address, valueItem, t, t + dateOffset)

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

            let sellerBalanceBefore = await provider.getBalance(lastAuctionItem[4])

            await auctionHouse.connect(owner).endAuction(1)


            lastAuctionItem = await auctionHouse.connect(owner).getAuction(1)
            //console.log("------")
            let lastTime = await time.latest()
            //console.log(lastAuctionItem)
            expect(lastAuctionItem[6]).to.equal(owner.address)
            expect(lastAuctionItem[7]).to.equal(birdNewValueItem)
            expect(lastAuctionItem[9]).to.equal(true)
            expect(lastAuctionItem[11]).to.equal(lastTime)


            let sellerBalanceAfter = await provider.getBalance(lastAuctionItem[4])
            expect(sellerBalanceAfter).to.equal(sellerBalanceBefore.add(lastAuctionItem[7]))

            /*
            let bids = await auctionHouse.connect(owner).getBid(1)
            console.log(bids)*/



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


