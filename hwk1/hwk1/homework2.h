#pragma once
#include "ProblemGroups.h"

class HWK2Class : public GroupManager
{
public:
	HWK2Class() : GroupManager("Homework 2")
	{
		groups_ = GroupFactory();
	}
	virtual std::string ProblemGroupName() { return "Homework 2"; }
	virtual std::string ProblemName() { return ""; }

	std::map<int, ProblemGroup*> GroupFactory();
};



