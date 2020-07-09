import { Wallet, Signer } from 'ethers'

import * as deployment from './deployment'
import { evmSnapshot, evmRevert } from './testHelpers'

export class NetworkFixture {
  lastSnapshotId: number

  constructor() {
    this.lastSnapshotId = 0
  }

  async load(
    governor: Signer,
    slasher: Signer = Wallet.createRandom() as Signer,
    arbitrator: Signer = Wallet.createRandom() as Signer,
  ) {
    const arbitratorAddress = await arbitrator.getAddress()
    const governorAddress = await governor.getAddress()
    const slasherAddress = await slasher.getAddress()

    // Deploy contracts
    const epochManager = await deployment.deployEpochManager(governorAddress)
    const grt = await deployment.deployGRT(governorAddress)
    const curation = await deployment.deployCuration(governorAddress, grt.address)
    const staking = await deployment.deployStaking(
      governor,
      grt.address,
      epochManager.address,
      curation.address,
    )
    const disputeManager = await deployment.deployDisputeManager(
      governorAddress,
      grt.address,
      arbitratorAddress,
      staking.address,
    )

    // Configuration
    await staking.connect(governor).setSlasher(slasherAddress, true)
    await curation.connect(governor).setStaking(staking.address)

    return {
      disputeManager,
      epochManager,
      grt,
      curation,
      staking,
    }
  }

  async setUp(): Promise<void> {
    this.lastSnapshotId = await evmSnapshot()
  }

  async tearDown(): Promise<void> {
    await evmRevert(this.lastSnapshotId)
  }
}