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

float SetHwk1ValueN();
float SetHwk1ValueM();
float SkipVerify();
float RunCount();
float exCL_add();
float exSequential_addC();
float exSequential_addSTL();
float exCL_SAXPY_1D();
float exSequential_SAXPY_1D_C();
float exSequential_SAXPY_1D_STL();
float exCL_SAXPY_2D();
float exSequential_SAXPY_2D_C();
float exSequential_SAXPY_2D_STL();