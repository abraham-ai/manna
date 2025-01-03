import { BigInt } from "@graphprotocol/graph-ts";
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
  Unpraised as UnpraisedEvent,
} from "../generated/Abraham/Abraham";
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
  Unpraised,
  Creation,
} from "../generated/schema";

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.owner = event.params.owner;
  entity.spender = event.params.spender;
  entity.value = event.params.value;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleBoughtManna(event: BoughtMannaEvent): void {
  let entity = new BoughtManna(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.buyer = event.params.buyer;
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

// export function handleConvictionUpdated(event: ConvictionUpdatedEvent): void {
//   let entity = new ConvictionUpdated(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.creationId = event.params.creationId
//   entity.newConviction = event.params.newConviction

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }
export function handleConvictionUpdated(event: ConvictionUpdatedEvent): void {
  // Existing logic to save ConvictionUpdated event
  let convictionEntity = new ConvictionUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  convictionEntity.creationId = event.params.creationId;
  convictionEntity.newConviction = event.params.newConviction;

  convictionEntity.blockNumber = event.block.number;
  convictionEntity.blockTimestamp = event.block.timestamp;
  convictionEntity.transactionHash = event.transaction.hash;

  convictionEntity.save();

  // Update the Creation entity
  let creationId = event.params.creationId.toString();
  let creation = Creation.load(creationId);
  if (creation != null) {
    creation.conviction = event.params.newConviction;
    creation.updatedAt = event.block.timestamp;
    creation.save();
  }
}

// export function handleCreationAdded(event: CreationAddedEvent): void {
//   let entity = new CreationAdded(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.creationId = event.params.creationId
//   entity.metadataUri = event.params.metadataUri

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

export function handleCreationAdded(event: CreationAddedEvent): void {
  let creationId = event.params.creationId.toString();

  // Check if the Creation already exists to prevent duplicates
  let creation = Creation.load(creationId);
  if (creation == null) {
    creation = new Creation(creationId);
    creation.creationId = event.params.creationId;
    creation.metadataUri = event.params.metadataUri;
    creation.totalStaked = BigInt.fromI32(0);
    creation.praisePool = BigInt.fromI32(0);
    creation.conviction = BigInt.fromI32(0);
    creation.createdAt = event.block.timestamp;
    creation.updatedAt = event.block.timestamp;
    creation.save();
  }
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.previousOwner = event.params.previousOwner;
  entity.newOwner = event.params.newOwner;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handlePraiseListed(event: PraiseListedEvent): void {
  let entity = new PraiseListed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.listingId = event.params.listingId;
  entity.creationId = event.params.creationId;
  entity.seller = event.params.seller;
  entity.amount = event.params.amount;
  entity.pricePerPraise = event.params.pricePerPraise;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handlePraiseSold(event: PraiseSoldEvent): void {
  let entity = new PraiseSold(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.listingId = event.params.listingId;
  entity.creationId = event.params.creationId;
  entity.buyer = event.params.buyer;
  entity.amount = event.params.amount;
  entity.totalCost = event.params.totalCost;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

// export function handlePraised(event: PraisedEvent): void {
//   let entity = new Praised(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.creationId = event.params.creationId
//   entity.user = event.params.user
//   entity.pricePaid = event.params.pricePaid
//   entity.unitsPraised = event.params.unitsPraised

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

export function handlePraised(event: PraisedEvent): void {
  // Existing logic to save Praised event
  let praisedEntity = new Praised(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  praisedEntity.creationId = event.params.creationId;
  praisedEntity.user = event.params.user;
  praisedEntity.pricePaid = event.params.pricePaid;
  praisedEntity.unitsPraised = event.params.unitsPraised;

  praisedEntity.blockNumber = event.block.number;
  praisedEntity.blockTimestamp = event.block.timestamp;
  praisedEntity.transactionHash = event.transaction.hash;

  praisedEntity.save();

  // Update the Creation entity
  let creationId = event.params.creationId.toString();
  let creation = Creation.load(creationId);
  if (creation != null) {
    creation.totalStaked = creation.totalStaked.plus(event.params.unitsPraised);
    creation.praisePool = creation.praisePool.plus(event.params.pricePaid);
    creation.updatedAt = event.block.timestamp;
    creation.save();
  }
}

export function handleSoldManna(event: SoldMannaEvent): void {
  let entity = new SoldManna(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seller = event.params.seller;
  entity.mannaAmount = event.params.mannaAmount;
  entity.ethAmount = event.params.ethAmount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.value = event.params.value;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

// export function handleUnpraised(event: UnpraisedEvent): void {
//   let entity = new Unpraised(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.creationId = event.params.creationId
//   entity.user = event.params.user
//   entity.unitsUnpraised = event.params.unitsUnpraised
//   entity.mannaRefunded = event.params.mannaRefunded

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }
export function handleUnpraised(event: UnpraisedEvent): void {
  // Existing logic to save Unpraised event
  let unpraisedEntity = new Unpraised(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  unpraisedEntity.creationId = event.params.creationId;
  unpraisedEntity.user = event.params.user;
  unpraisedEntity.unitsUnpraised = event.params.unitsUnpraised;
  unpraisedEntity.mannaRefunded = event.params.mannaRefunded;

  unpraisedEntity.blockNumber = event.block.number;
  unpraisedEntity.blockTimestamp = event.block.timestamp;
  unpraisedEntity.transactionHash = event.transaction.hash;

  unpraisedEntity.save();

  // Update the Creation entity
  let creationId = event.params.creationId.toString();
  let creation = Creation.load(creationId);
  if (creation != null) {
    creation.totalStaked = creation.totalStaked.minus(
      event.params.unitsUnpraised
    );
    creation.praisePool = creation.praisePool.minus(event.params.mannaRefunded);
    creation.updatedAt = event.block.timestamp;
    creation.save();
  }
}
