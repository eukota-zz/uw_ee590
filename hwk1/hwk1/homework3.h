#pragma once
#include "ProblemGroups.h"

extern bool USE_HARDCODED_LOCAL_WORKGROUP_SIZES;

class HWK3Class : public GroupManager
{
public:
	HWK3Class();
	virtual std::string ProblemGroupName() { return "Homework 3"; }
	virtual std::string ProblemName() { return ""; }

	std::map<int, ProblemGroup*> GroupFactory();

	///// Local Setting /////
	static int UseHardcodedLocalWorkgroupSizes(ResultsStruct* results);
};


///// MATRIX POWER //////
int exCL_MatrixPower_Helper(ResultsStruct* results, const std::string& KernelName);
int exCL_MatrixPower(ResultsStruct* results);
int exCL_MatrixPower_Manual(ResultsStruct* results);
int exSequential_MatrixPower(ResultsStruct* results);

///// PROGRESSIVE ARRAY SUM //////
int exCL_ProgressiveArraySum(ResultsStruct* results);
int exSequential_ProgressiveArraySum(ResultsStruct* results);
