import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
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
} from "../generated/Abraham/Abraham"

export function createApprovalEvent(
  owner: Address,
  spender: Address,
  value: BigInt
): Approval {
  let approvalEvent = changetype<Approval>(newMockEvent())

  approvalEvent.parameters = new Array()

  approvalEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam("spender", ethereum.Value.fromAddress(spender))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  )

  return approvalEvent
}

export function createBoughtMannaEvent(
  buyer: Address,
  amount: BigInt
): BoughtManna {
  let boughtMannaEvent = changetype<BoughtManna>(newMockEvent())

  boughtMannaEvent.parameters = new Array()

  boughtMannaEvent.parameters.push(
    new ethereum.EventParam("buyer", ethereum.Value.fromAddress(buyer))
  )
  boughtMannaEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return boughtMannaEvent
}

export function createConvictionUpdatedEvent(
  creationId: BigInt,
  newConviction: BigInt
): ConvictionUpdated {
  let convictionUpdatedEvent = changetype<ConvictionUpdated>(newMockEvent())

  convictionUpdatedEvent.parameters = new Array()

  convictionUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "creationId",
      ethereum.Value.fromUnsignedBigInt(creationId)
    )
  )
  convictionUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newConviction",
      ethereum.Value.fromUnsignedBigInt(newConviction)
    )
  )

  return convictionUpdatedEvent
}

export function createCreationAddedEvent(
  creationId: BigInt,
  metadataUri: string
): CreationAdded {
  let creationAddedEvent = changetype<CreationAdded>(newMockEvent())

  creationAddedEvent.parameters = new Array()

  creationAddedEvent.parameters.push(
    new ethereum.EventParam(
      "creationId",
      ethereum.Value.fromUnsignedBigInt(creationId)
    )
  )
  creationAddedEvent.parameters.push(
    new ethereum.EventParam(
      "metadataUri",
      ethereum.Value.fromString(metadataUri)
    )
  )

  return creationAddedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPraiseListedEvent(
  listingId: BigInt,
  creationId: BigInt,
  seller: Address,
  amount: BigInt,
  pricePerPraise: BigInt
): PraiseListed {
  let praiseListedEvent = changetype<PraiseListed>(newMockEvent())

  praiseListedEvent.parameters = new Array()

  praiseListedEvent.parameters.push(
    new ethereum.EventParam(
      "listingId",
      ethereum.Value.fromUnsignedBigInt(listingId)
    )
  )
  praiseListedEvent.parameters.push(
    new ethereum.EventParam(
      "creationId",
      ethereum.Value.fromUnsignedBigInt(creationId)
    )
  )
  praiseListedEvent.parameters.push(
    new ethereum.EventParam("seller", ethereum.Value.fromAddress(seller))
  )
  praiseListedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  praiseListedEvent.parameters.push(
    new ethereum.EventParam(
      "pricePerPraise",
      ethereum.Value.fromUnsignedBigInt(pricePerPraise)
    )
  )

  return praiseListedEvent
}

export function createPraiseSoldEvent(
  listingId: BigInt,
  creationId: BigInt,
  buyer: Address,
  amount: BigInt,
  totalCost: BigInt
): PraiseSold {
  let praiseSoldEvent = changetype<PraiseSold>(newMockEvent())

  praiseSoldEvent.parameters = new Array()

  praiseSoldEvent.parameters.push(
    new ethereum.EventParam(
      "listingId",
      ethereum.Value.fromUnsignedBigInt(listingId)
    )
  )
  praiseSoldEvent.parameters.push(
    new ethereum.EventParam(
      "creationId",
      ethereum.Value.fromUnsignedBigInt(creationId)
    )
  )
  praiseSoldEvent.parameters.push(
    new ethereum.EventParam("buyer", ethereum.Value.fromAddress(buyer))
  )
  praiseSoldEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  praiseSoldEvent.parameters.push(
    new ethereum.EventParam(
      "totalCost",
      ethereum.Value.fromUnsignedBigInt(totalCost)
    )
  )

  return praiseSoldEvent
}

export function createPraisedEvent(
  creationId: BigInt,
  user: Address,
  pricePaid: BigInt,
  unitsPraised: BigInt
): Praised {
  let praisedEvent = changetype<Praised>(newMockEvent())

  praisedEvent.parameters = new Array()

  praisedEvent.parameters.push(
    new ethereum.EventParam(
      "creationId",
      ethereum.Value.fromUnsignedBigInt(creationId)
    )
  )
  praisedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  praisedEvent.parameters.push(
    new ethereum.EventParam(
      "pricePaid",
      ethereum.Value.fromUnsignedBigInt(pricePaid)
    )
  )
  praisedEvent.parameters.push(
    new ethereum.EventParam(
      "unitsPraised",
      ethereum.Value.fromUnsignedBigInt(unitsPraised)
    )
  )

  return praisedEvent
}

export function createSoldMannaEvent(
  seller: Address,
  mannaAmount: BigInt,
  ethAmount: BigInt
): SoldManna {
  let soldMannaEvent = changetype<SoldManna>(newMockEvent())

  soldMannaEvent.parameters = new Array()

  soldMannaEvent.parameters.push(
    new ethereum.EventParam("seller", ethereum.Value.fromAddress(seller))
  )
  soldMannaEvent.parameters.push(
    new ethereum.EventParam(
      "mannaAmount",
      ethereum.Value.fromUnsignedBigInt(mannaAmount)
    )
  )
  soldMannaEvent.parameters.push(
    new ethereum.EventParam(
      "ethAmount",
      ethereum.Value.fromUnsignedBigInt(ethAmount)
    )
  )

  return soldMannaEvent
}

export function createTransferEvent(
  from: Address,
  to: Address,
  value: BigInt
): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent())

  transferEvent.parameters = new Array()

  transferEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  )

  return transferEvent
}

export function createUnpraisedEvent(
  creationId: BigInt,
  user: Address,
  unitsUnpraised: BigInt,
  mannaRefunded: BigInt
): Unpraised {
  let unpraisedEvent = changetype<Unpraised>(newMockEvent())

  unpraisedEvent.parameters = new Array()

  unpraisedEvent.parameters.push(
    new ethereum.EventParam(
      "creationId",
      ethereum.Value.fromUnsignedBigInt(creationId)
    )
  )
  unpraisedEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  )
  unpraisedEvent.parameters.push(
    new ethereum.EventParam(
      "unitsUnpraised",
      ethereum.Value.fromUnsignedBigInt(unitsUnpraised)
    )
  )
  unpraisedEvent.parameters.push(
    new ethereum.EventParam(
      "mannaRefunded",
      ethereum.Value.fromUnsignedBigInt(mannaRefunded)
    )
  )

  return unpraisedEvent
}
