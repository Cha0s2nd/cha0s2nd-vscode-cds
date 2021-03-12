export enum ExecutionStages {
  InitialPreOperation = 5, //	For internal use only
  PreValidation = 10,
  InternalPreOperationBeforeExternal = 15, // Before External Plugins (For internal use only)
  PreOperation = 20,
  InternalPreOperationAfterExternal = 25,	 // After External Plugins (For internal use only)
  MainOperation = 30, //	For internal use only
  InternalPostOperationBeforeExternal = 35,	// Before External Plugins (For internal use only)
  PostOperation = 40,
  InternalPostOperationAfterExternal = 45, // After External Plugins(For internal use only)
  PostOperationDeprecated = 50,
  FinalPostOperation = 55, // For internal use only
  PreCommit = 80, // Stage fired before transaction commit (For internal use only)
  Post = 90 // Commit stage fired after transaction commit (For internal use only)
}