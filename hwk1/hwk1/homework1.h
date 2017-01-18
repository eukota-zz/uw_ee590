#pragma once
#include "ProblemGroups.h"

class HWK1Class : public GroupManager
{
public:
	HWK1Class() : GroupManager("Homework 1")
	{
		groups_ = GroupFactory();
	}
	virtual std::string ProblemGroupName() { return "Homework 1"; }
	virtual std::string ProblemName() { return ""; }
	
	std::map<int, ProblemGroup*> GroupFactory();
};

int SetHwk1ValueN(ResultsStruct* results);
int SetHwk1ValueM(ResultsStruct* results);
int SkipVerify(ResultsStruct* results);
int RunCount(ResultsStruct* results);
int exCL_add(ResultsStruct* results);
int exSequential_addC(ResultsStruct* results);
int exSequential_addSTL(ResultsStruct* results);
int exCL_SAXPY_1D(ResultsStruct* results);
int exSequential_SAXPY_1D_C(ResultsStruct* results);
int exSequential_SAXPY_1D_STL(ResultsStruct* results);
int exCL_SAXPY_2D(ResultsStruct* results);
int exSequential_SAXPY_2D_C(ResultsStruct* results);
int exSequential_SAXPY_2D_STL(ResultsStruct* results);