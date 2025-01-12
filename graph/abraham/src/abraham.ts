import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
  Approval as ApprovalEvent,
  BoughtManna as BoughtMannaEvent,
  ConvictionUpdated as ConvictionUpdatedEvent,
  CreationAdded as CreationAddedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Praised as PraisedEvent,
  SoldManna as SoldMannaEvent,
  Transfer as TransferEvent,
  Unpraised as UnpraisedEvent,
} from "../generated/Abraham/Abraham";
import {
  Approval,
  BoughtManna,
  ConvictionUpdated,
  Creation,
  CreationAdded,
  OwnershipTransferred,
  Praised,
  PraiseCount,
  SoldManna,
  Transfer,
  Unpraised,
} from "../generated/schema";

// -------------------------------------
// handleApproval
// -------------------------------------
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

// -------------------------------------
// handleBoughtManna
// -------------------------------------
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

// -------------------------------------
// handleConvictionUpdated
// -------------------------------------
export function handleConvictionUpdated(event: ConvictionUpdatedEvent): void {
  // 1. Save the ConvictionUpdated event (immutable log)
  let convictionEntity = new ConvictionUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  convictionEntity.creationId = event.params.creationId;
  convictionEntity.newConviction = event.params.newConviction;
  convictionEntity.blockNumber = event.block.number;
  convictionEntity.blockTimestamp = event.block.timestamp;
  convictionEntity.transactionHash = event.transaction.hash;
  convictionEntity.save();

  // 2. Update the Creation entity
  let creationIdString = event.params.creationId.toString();
  let creation = Creation.load(creationIdString);
  if (creation !== null) {
    creation.conviction = event.params.newConviction;
    creation.updatedAt = event.block.timestamp;
    creation.save();
  }
}

// -------------------------------------
// handleCreationAdded
// -------------------------------------
export function handleCreationAdded(event: CreationAddedEvent): void {
  let creationIdString = event.params.creationId.toString();

  // 1. Create or load Creation entity
  let creation = Creation.load(creationIdString);
  if (creation == null) {
    creation = new Creation(creationIdString);
    creation.creationId = event.params.creationId;
    creation.metadataUri = event.params.metadataUri;
    creation.totalStaked = BigInt.zero();
    creation.praisePool = BigInt.zero();
    creation.conviction = BigInt.zero();
    creation.createdAt = event.block.timestamp;
    creation.updatedAt = event.block.timestamp;
    creation.save();
  }

  // 2. Save the immutable event
  let eventEntity = new CreationAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  eventEntity.creationId = event.params.creationId;
  eventEntity.metadataUri = event.params.metadataUri;
  eventEntity.blockNumber = event.block.number;
  eventEntity.blockTimestamp = event.block.timestamp;
  eventEntity.transactionHash = event.transaction.hash;
  eventEntity.save();
}

// -------------------------------------
// handleOwnershipTransferred
// -------------------------------------
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

// -------------------------------------
// handlePraised
// -------------------------------------
export function handlePraised(event: PraisedEvent): void {
  // 1. Save the Praised event (immutable)
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

  // 2. Update the Creation entity
  let creationIdString = event.params.creationId.toString();
  let creation = Creation.load(creationIdString);
  if (creation !== null) {
    creation.totalStaked = creation.totalStaked.plus(event.params.unitsPraised);
    creation.praisePool = creation.praisePool.plus(event.params.pricePaid);
    creation.updatedAt = event.block.timestamp;
    creation.save();
  }

  // 3. Update the aggregated PraiseCount
  let praiseCountId = creationIdString + "-" + event.params.user.toHexString();
  let praiseCount = PraiseCount.load(praiseCountId);
  if (praiseCount == null) {
    praiseCount = new PraiseCount(praiseCountId);
    // This must match the Creation's id exactly
    praiseCount.creation = creationIdString;
    praiseCount.userAddress = event.params.user;
    praiseCount.noOfPraises = event.params.unitsPraised;
  } else {
    praiseCount.noOfPraises = praiseCount.noOfPraises.plus(
      event.params.unitsPraised
    );
  }
  praiseCount.save();
}

// -------------------------------------
// handleSoldManna
// -------------------------------------
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

// -------------------------------------
// handleTransfer
// -------------------------------------
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

// -------------------------------------
// handleUnpraised
// -------------------------------------
export function handleUnpraised(event: UnpraisedEvent): void {
  // 1. Save the Unpraised event (immutable)
  let unpraisedEntity = new Unpraised(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  unpraisedEntity.creationId = event.params.creationId;
  unpraisedEntity.user = event.params.user;
  unpraisedEntity.unitsUnpraised = event.params.unitsUnpraised;
  unpraisedEntity.mannaRefunded = event.params.mannaRefunded;
  unpraisedEntity.unpraiseCost = event.params.unpraiseCost;
  unpraisedEntity.blockNumber = event.block.number;
  unpraisedEntity.blockTimestamp = event.block.timestamp;
  unpraisedEntity.transactionHash = event.transaction.hash;
  unpraisedEntity.save();

  // 2. Update the Creation entity
  let creationIdString = event.params.creationId.toString();
  let creation = Creation.load(creationIdString);
  if (creation !== null) {
    creation.totalStaked = creation.totalStaked.minus(
      event.params.unitsUnpraised
    );
    creation.praisePool = creation.praisePool.minus(event.params.mannaRefunded);
    creation.updatedAt = event.block.timestamp;
    creation.save();
  }

  // 3. Update the aggregated PraiseCount
  let praiseCountId = creationIdString + "-" + event.params.user.toHexString();
  let praiseCount = PraiseCount.load(praiseCountId);
  if (praiseCount !== null) {
    praiseCount.noOfPraises = praiseCount.noOfPraises.minus(
      event.params.unitsUnpraised
    );

    // Avoid negative values (just a safety check)
    if (praiseCount.noOfPraises < BigInt.zero()) {
      praiseCount.noOfPraises = BigInt.zero();
    }
    praiseCount.save();
  }
}
