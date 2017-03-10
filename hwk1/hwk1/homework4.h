#pragma once
#include "ProblemGroups.h"


class HWK4Class : public GroupManager
{
public:
	HWK4Class();
	virtual std::string ProblemGroupName() { return "Homework 4"; }
	virtual std::string ProblemName() { return ""; }

	std::map<int, ProblemGroup*> GroupFactory();

	static int UseHardcodedLocalWorkgroupSizes(ResultsStruct* results);
};

int exCL_reduce_Helper(ResultsStruct* results, const std::string& kernelName);
int exCL_reduce_v1(ResultsStruct* results);
int exCL_reduce_v2(ResultsStruct* results);
int exCL_reduce_v3(ResultsStruct* results);

int exCL_inclusive_sum_scan_Helper(ResultsStruct* results, const std::string& kernelName);
int exCL_inclusive_sum_scan_v1(ResultsStruct* results);
int exCL_inclusive_sum_scan_v2(ResultsStruct* results);
int exSeq_inclusive_sum_scan(ResultsStruct* results);