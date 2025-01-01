import {
  Approval as ApprovalEvent,
  BoughtManna as BoughtMannaEvent,
  ConvictionUpdated as ConvictionUpdatedEvent,
  CreationAdded as CreationAddedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PraiseListed as PraiseListedEvent,
  PraiseSold as PraiseSoldEvent,
  Praised as PraisedEvent,
  SoldManna as SoldMannaEvent,
  Transfer as TransferEvent,
  Unpraised as UnpraisedEvent
} from "../generated/Abraham/Abraham"
import {
  Approval,
  BoughtManna,
  ConvictionUpdated,
  CreationAdded,
  OwnershipTransferred,
  PraiseListed,
  PraiseSold,
  Praised,
  SoldManna,
  Transfer,
  Unpraised
} from "../generated/schema"

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.spender = event.params.spender
  entity.value = event.params.value

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleBoughtManna(event: BoughtMannaEvent): void {
  let entity = new BoughtManna(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.buyer = event.params.buyer
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleConvictionUpdated(event: ConvictionUpdatedEvent): void {
  let entity = new ConvictionUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.creationId = event.params.creationId
  entity.newConviction = event.params.newConviction

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleCreationAdded(event: CreationAddedEvent): void {
  let entity = new CreationAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.creationId = event.params.creationId
  entity.metadataUri = event.params.metadataUri

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePraiseListed(event: PraiseListedEvent): void {
  let entity = new PraiseListed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.listingId = event.params.listingId
  entity.creationId = event.params.creationId
  entity.seller = event.params.seller
  entity.amount = event.params.amount
  entity.pricePerPraise = event.params.pricePerPraise

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePraiseSold(event: PraiseSoldEvent): void {
  let entity = new PraiseSold(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.listingId = event.params.listingId
  entity.creationId = event.params.creationId
  entity.buyer = event.params.buyer
  entity.amount = event.params.amount
  entity.totalCost = event.params.totalCost

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePraised(event: PraisedEvent): void {
  let entity = new Praised(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.creationId = event.params.creationId
  entity.user = event.params.user
  entity.pricePaid = event.params.pricePaid
  entity.unitsPraised = event.params.unitsPraised

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSoldManna(event: SoldMannaEvent): void {
  let entity = new SoldManna(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.seller = event.params.seller
  entity.mannaAmount = event.params.mannaAmount
  entity.ethAmount = event.params.ethAmount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.value = event.params.value

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleUnpraised(event: UnpraisedEvent): void {
  let entity = new Unpraised(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.creationId = event.params.creationId
  entity.user = event.params.user
  entity.unitsUnpraised = event.params.unitsUnpraised
  entity.mannaRefunded = event.params.mannaRefunded

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
