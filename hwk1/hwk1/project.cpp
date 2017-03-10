#include "CL/cl.h"
#include "OCLArgs.h"
#include "tools.h"
#include "utils.h"
#include "project.h"
#include "arithmetic.h"
#include "enums.h"
#include <iostream>
#include <vector>
#include <algorithm>

namespace
{
	bool USE_HARDCODED_LOCAL_WORKGROUP_SIZES = false;
	const char* FILENAME = "homework4.cl";
	size_t* HARDCODED_LOCAL_WORKGROUP_SIZE = NULL;
}

ProjectClass::ProjectClass()
	: GroupManager("Homework 4")
{
	groups_ = GroupFactory();
}


std::map<int, ProblemGroup*> ProjectClass::GroupFactory()
{
	std::map<int, ProblemGroup*> pgs;

//	ProblemGroup* InputControl = GroupManagerInputControlFactory();
//	InputControl->problems_[InputControl->problems_.size() + 1] = new Problem(&ProjectClass::UseHardcodedLocalWorkgroupSizes, "Use Hardcoded Local Workgroup Sizes");
//	pgs[InputControl->GroupNum()] = InputControl;

	ProblemGroup* projectFuncs = new ProblemGroup(1, "Homework 4");
	int num = 0;
	projectFuncs->problems_[projectFuncs->problems_.size() + 1] = new Problem(&SampleFunction, "Sample function does nothing");
	pgs[projectFuncs->GroupNum()] = projectFuncs;
	return pgs;
}

int SampleFunction(ResultsStruct* results)
{
	return 0;
}
