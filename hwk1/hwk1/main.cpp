
#include <iostream>
#include <stdio.h>
#include <stdlib.h>
#include <tchar.h>
#include <memory.h>
#include <vector>
#include <map>
#include <string>

#include "CL\cl.h"
#include "utils.h"
#include "profiler.h"
#include "tools.h"
#include "arithmetic.h"
#include "OCLArgs.h"
#include "enums.h"
#include "homework1.h"
#include "homework2.h"
#include "ProblemGroups.h"

//for perf. counters
#include <Windows.h>

using namespace std;

void PrintInstructions()
{
	cout << endl << "MAIN MENU:" << endl
		<< "// 1 --> Homework 1 //" << endl
		<< "// 2 --> Homework 2 //" << endl
		<< "// Q --> Quit       //" << endl
		<< endl;
}

int _tmain(int argc, TCHAR* argv[])
{
	srand(12345);
	bool runTests = false;
	string input;
	do
	{
		int res = 0;
		PrintInstructions();
		cin >> input;
		if (input == "1")
		{
			HWK1Class hwk1c;
			res = hwk1c.Run();
		}
		if (input == "2")
		{
			HWK2Class hwk2c;
			res = hwk2c.Run();
		}
		if (input == "Q" || input == "q")
		{
			break;
		}
		cout << "Results (0 = success): \n" << res << endl;
	} while (true);

	return 0;
}


