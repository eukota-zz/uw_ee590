#include <iostream>
#include <string>
#include <vector>
#include "tools.h"
#include "ProblemGroups.h"

int ProblemGroup::operator()(int problem)
{
	if (problems_.find(problem) == problems_.end())
	{
		std::cout << "WARNING: " << problem_group_num_ << "." << problem << " not found" << std::endl;
		return -1;
	}
	return problems_[problem]->operator()();
}
GroupManager::GroupManager(const std::string& name)
	: GroupName(name)
{
}

GroupManager::~GroupManager()
{
	for (std::map<int, ProblemGroup*>::iterator i = groups_.begin(), e = groups_.end(); i != e; ++i)
		delete i->second;
}

void GroupManager::PrintGroupMenu()
{
	std::cout << "Group: " << GroupName.c_str() << std::endl;
	for (std::map<int, ProblemGroup*>::const_iterator i = groups_.begin(), e = groups_.end(); i != e; ++i)
	{
		for (std::map<int, Problem*>::const_iterator g = i->second->problems_.begin(), h = i->second->problems_.end(); h != g; ++g)
		{
			std::cout << i->first << "." << g->first << ": " << g->second->Annotation().c_str() << std::endl;
		}
	}
}

int GroupManager::Run()
{
	int result = 0;
	std::cout << "Running new " << GroupName.c_str() << " Tests" << std::endl;
	std::string input;
	do
	{
		std::cout << "-------------------------------------------------------" << std::endl;
		std::cout << "Enter " << ProblemGroupName().c_str() << "." << ProblemName().c_str() << " to run: " << std::endl;
		std::cout << "(enter \"?\" for list of functions)" << std::endl;

		std::cin >> input;
		if (input == "?")
		{
			PrintGroupMenu();
			continue;
		}
		if (atoi(input.c_str()) == -1)
			return 0;

		std::vector<std::string> selection = (tools::split(input, "."));
		int problemgroup = atoi(selection[0].c_str());
		int problem = atoi(selection[1].c_str());
		std::cout << "-------------------------------------------------------" << std::endl;
		if (groups_.find(problemgroup) == groups_.end())
		{
			std::cout << "WARNING: " << ProblemGroupName().c_str() << " " << problemgroup << " not found." << std::endl;
			continue;
		}
		std::cout << "Running " << ProblemGroupName() << " " << problemgroup << ": " /*<< ProblemName() << " " */ << groups_[problemgroup]->problems_[problem]->Annotation() << std::endl;
		result = groups_[problemgroup]->operator()(problem);
		if (result != 0)
			break;

	} while (atoi(input.c_str()) != -1);
	return result;
}