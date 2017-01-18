#pragma once
#include "ProblemGroups.h"

class HWK2Class : public GroupManager
{
public:
	HWK2Class();
	virtual std::string ProblemGroupName() { return "Homework 2"; }
	virtual std::string ProblemName() { return ""; }

	std::map<int, ProblemGroup*> GroupFactory();

};

int exCL_DotProduct_Manual(ResultsStruct* results);
int exCL_DotProduct(ResultsStruct* results);
int exCL_MAD(ResultsStruct* results);
int exCL_FMA(ResultsStruct* results);
int exSequential_MAD(ResultsStruct* results);
int exCL_CrossProduct(ResultsStruct* results);
int exCL_CrossProduct_Reverse(ResultsStruct* results);
int exCL_FastLength(ResultsStruct* results);
int exCL_NativeSquareRoot(ResultsStruct* results);
int exCL_SquareRoot(ResultsStruct* results);

