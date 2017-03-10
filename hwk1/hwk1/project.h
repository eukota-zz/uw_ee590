#pragma once
#include "ProblemGroups.h"


class ProjectClass : public GroupManager
{
public:
	ProjectClass();
	virtual std::string ProblemGroupName() { return "Project"; }
	virtual std::string ProblemName() { return ""; }

	std::map<int, ProblemGroup*> GroupFactory();

//	static int UseHardcodedLocalWorkgroupSizes(ResultsStruct* results);
};

int SampleFunction(ResultsStruct* results);
