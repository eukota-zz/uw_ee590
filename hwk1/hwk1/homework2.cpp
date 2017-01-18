#include "CL/cl.h"
#include "OCLArgs.h"
#include "tools.h"
#include "utils.h"
#include "homework2.h"
#include "arithmetic.h"
#include "enums.h"
#include <iostream>


/////////// HOMEWORK 2
std::map<int, ProblemGroup*> HWK2Class::GroupFactory()
{
	std::map<int, ProblemGroup*> pgs;
	ProblemGroup* Homework2 = new ProblemGroup(1, "Homework 2");
	pgs[Homework2->GroupNum()] = Homework2;
	return pgs;
}

