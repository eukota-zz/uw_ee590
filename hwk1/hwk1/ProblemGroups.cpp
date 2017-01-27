#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include "tools.h"
#include "utils.h"
#include "ProblemGroups.h"
#include "arithmetic.h"

int GLOBAL_ARRAY_WIDTH = 1024;
int GLOBAL_ARRAY_HEIGHT = 1024;
bool SKIP_VERIFICATION = false;
bool PRINT_TO_FILE = false;
std::string RESULTS_FILE = "results.txt";
bool FIND_OPTIMAL_LOCAL_WORKGROUP_SIZE = false;

ResultsStruct::ResultsStruct()
	: WindowsRunTime(0.0)
	, OpenCLRunTime(0.0)
	, HasWindowsRunTime(false)
	, HasOpenCLRunTime(false)
{
	WorkGroupSize[0] = 0;
	WorkGroupSize[1] = 0;
	WorkGroupSize[2] = 0;
}

bool resultTimeOCL(ResultsStruct* A, ResultsStruct* B)
{
	return A->OpenCLRunTime < B->OpenCLRunTime;
}
// Ensure memory is cleared
ResultsList::~ResultsList()
{
	while (!empty())
	{
		ResultsStruct* s = this->back();
		this->pop_back();
		delete s;
	}
}

void PrintWorkGroupResultsToFile(const ResultsList& results)
{
	std::ofstream outfile;
	outfile.open(RESULTS_FILE, std::ios_base::app);
	if (results.empty())
	{
		outfile << "No results";
		return;
	}

	double bestOpenCLTime = 100000;
	size_t bestOpenCLWorkSize[3] = { 0,0,0 };
	int num = 0;
	outfile << results.front()->Annotation << std::endl;
	outfile << "Run Number & WorkGroupSize & OpenCLTime\\\\hline\\hline" << std::endl;
	for (ResultsList::const_iterator i = results.begin(), e = results.end(); i != e; ++i, ++num)
	{
		if ((*i)->OpenCLRunTime < bestOpenCLTime)
		{
			bestOpenCLTime = (*i)->OpenCLRunTime;
			bestOpenCLWorkSize[0] = (*i)->WorkGroupSize[0];
			bestOpenCLWorkSize[1] = (*i)->WorkGroupSize[1];
			bestOpenCLWorkSize[2] = (*i)->WorkGroupSize[2];
		}
		outfile << num + 1 << " & (" << (*i)->WorkGroupSize[0] << "," << (*i)->WorkGroupSize[1] << "," << (*i)->WorkGroupSize[2] << ") & " << (*i)->OpenCLRunTime << "\\\\" << std::endl;
	}
	outfile << "Best Time: " << bestOpenCLTime << "; Work Group Size: (" << bestOpenCLWorkSize[0] << "," << bestOpenCLWorkSize[1] << "," << bestOpenCLWorkSize[2] << ")" << std::endl;
}

void PrintToFile(const ResultsList& results)
{
	std::ofstream outfile;
	outfile.open(RESULTS_FILE, std::ios_base::app); 
	if (results.empty())
	{
		outfile << "No results";
		return;
	}

	double totalWindowsTimes = 0.0;
	double totalOpenCLTimes = 0.0;
	int num = 0;
	outfile << results.front()->Annotation << std::endl;
	outfile << "Run#, WorkGroupSize, WindowsTime, OpenCLTime" << std::endl;
	for (ResultsList::const_iterator i = results.begin(), e = results.end(); i != e; ++i, ++num)
	{
		totalWindowsTimes += (*i)->WindowsRunTime;
		totalOpenCLTimes += (*i)->OpenCLRunTime;
		outfile << num+1 << "," << (*i)->WorkGroupSize << "," << (*i)->WindowsRunTime << "," << (*i)->OpenCLRunTime << std::endl;
	}
	const double WindowsAvg = totalWindowsTimes / (double)num;
	const double OpenCLAvg = totalOpenCLTimes / (double)num;

	outfile << "Windows Average: " << WindowsAvg << "; OpenCL Average: " << OpenCLAvg << std::endl;
}

void PrintResults(const ResultsList& results)
{
	if (results.empty())
		return;

	double totalWindowsTimes = 0.0;
	double totalOpenCLTimes = 0.0;
	int num = 0;
	for (ResultsList::const_iterator i = results.begin(), e = results.end(); i != e; ++i, ++num)
	{
		totalWindowsTimes += (*i)->WindowsRunTime;
		totalOpenCLTimes += (*i)->OpenCLRunTime;
		printf("Run: %d: Windows Profiler Runtime: %f ms. OpenCL Profiler Runtime: %f ms.\n", num+1, (*i)->WindowsRunTime, (*i)->OpenCLRunTime);
	}

	const double WindowsAvg = totalWindowsTimes / (double)num;
	const double OpenCLAvg = totalOpenCLTimes / (double)num;
	printf("---------------------------\n");
	if(results.front()->HasWindowsRunTime)
		printf("Average Windows Profiler Runtime: %f ms.\n", WindowsAvg);
	if (results.front()->HasOpenCLRunTime)
		printf("Average OpenCL Profiler Runtime : %f ms.\n", OpenCLAvg);

	if (PRINT_TO_FILE)
		PrintToFile(results);
}

int ProblemGroup::operator()(int problem)
{
	if (problems_.find(problem) == problems_.end())
	{
		std::cout << "WARNING: " << problem_group_num_ << "." << problem << " not found" << std::endl;
		return 0;
	}

	ResultsList results;
	int retVal = 0;
	const size_t runCount = (GroupNum() == 0 ? 1 : dmath::RUN_COUNT);
	for (int i = 0; i < runCount; i++)
	{
		if(GroupNum() != 0)
			printf("\r Running... %d. ", i);
		ResultsStruct* result = new ResultsStruct();
		retVal = problems_[problem]->operator()(result);
		result->Annotation = problems_[problem]->Annotation();
		results.push_back(result);
	}
	if (GroupNum() != 0)
	{
		printf("\n");
		PrintResults(results);
	}
	
	return retVal;
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
			LogInfo("Possible issue with result %d.\n", result);

	} while (atoi(input.c_str()) != -1);
	return result;
}

/////////// Input Gathering /////////////
ProblemGroup* GroupManagerInputControlFactory()
{
	// @TODO Modify structure so that input control annotation can print current value - will need a way to fetch current value - maybe mini-IOC?
	int num = 0;
	ProblemGroup* InputControl = new ProblemGroup(0, "Input Control");
	InputControl->problems_[++num] = new Problem(&SetValueM, "Set M Value (defaults to 1024)");
	InputControl->problems_[++num] = new Problem(&SetValueN, "Set N Value (defaults to 1024)");
	InputControl->problems_[++num] = new Problem(&SkipVerify, "Skip Verification (defaults to 0)");
	InputControl->problems_[++num] = new Problem(&RunCount, "Set the number of runs (defaults to 1)");
	InputControl->problems_[++num] = new Problem(&ComparisonThreshold, "Set minimum difference for verifications.");
	InputControl->problems_[++num] = new Problem(&PrintResultsToFile, "Set times to print to file (defaults to 0).");
	InputControl->problems_[++num] = new Problem(&SetResultsFile, "Set the file path for saving results.");
	InputControl->problems_[++num] = new Problem(&SetFindOptimalWorkGroupSize, "Enable local work group size search functionality.");
	return InputControl;
}

int SetValueM(ResultsStruct* results)
{
	GLOBAL_ARRAY_WIDTH = (int)tools::GetInput("Enter value for M:");
	return 0;
}
int SetValueN(ResultsStruct* results)
{
	GLOBAL_ARRAY_HEIGHT = (int)tools::GetInput("Enter value for N:");
	return 0;
}
int SkipVerify(ResultsStruct* results)
{
	std::cout << "Enter 1 to Skip Verification in functions. Enter 0 to Do Verification: ";
	unsigned int i = (unsigned int)SKIP_VERIFICATION;
	std::cin >> i;
	SKIP_VERIFICATION = (i == 1);
	return 0;
}
int RunCount(ResultsStruct* results)
{
	std::cout << "Enter number of runs to do: ";
	unsigned int i = dmath::RUN_COUNT;
	std::cin >> i;
	dmath::RUN_COUNT = i;
	return 0;
}
int ComparisonThreshold(ResultsStruct* results)
{
	std::cout << "Enter minimum difference value (currently " << dmath::MIN_DIFF << "): ";
	float i = dmath::MIN_DIFF;
	std::cin >> i;
	dmath::MIN_DIFF = i;
	return 0;
}
int PrintResultsToFile(ResultsStruct* results)
{
	std::cout << "Enter 1 to print results to file (currently " << PRINT_TO_FILE << "): ";
	unsigned int i = (unsigned int)PRINT_TO_FILE;
	std::cin >> i;
	PRINT_TO_FILE = (i == 1);
	return 0;
}
int SetResultsFile(ResultsStruct* results)
{
	std::cout << "Enter path to output file to (currently " << RESULTS_FILE << "): ";
	std::string s(RESULTS_FILE);
	std::cin >> s;
	RESULTS_FILE = s;
	return 0;
}
int SetFindOptimalWorkGroupSize(ResultsStruct* results)
{
	std::cout << "Enter 1 to find optimal local work group size (currently " << FIND_OPTIMAL_LOCAL_WORKGROUP_SIZE << "): ";
	unsigned int i = (unsigned int)FIND_OPTIMAL_LOCAL_WORKGROUP_SIZE;
	std::cin >> i;
	FIND_OPTIMAL_LOCAL_WORKGROUP_SIZE = (i == 1);
	return 0;
}
