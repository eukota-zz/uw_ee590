#pragma once
#include "profiler.h"
#include "CL\cl.h"

namespace tools
{
	class FuncPtr
	{
	private:
		int(*funcPtr)(ProfilerStruct*);
		ProfilerStruct profiler;
	public:
		FuncPtr(int(*f)(ProfilerStruct*), const std::string& desc) : funcPtr(f), description(desc) {}
		int operator()()
		{ 
			std::cout << "Running: " << description.c_str() << std::endl;
			return funcPtr(&profiler);
		}
		std::string description;
	};

	void PrintFuncs(const std::vector<FuncPtr>& funcs);

	std::vector<std::string> split(const std::string& str, const char* delim);

	void generateInputCL(cl_float* inputArray, cl_uint arrayWidth, cl_uint arrayHeight);

	void generateInputCMatrix(float arr[1024][1024]);
	
	void generateInputC(float* inputArray, size_t arrayWidth, size_t arrayHeight);
	
	void generateInputSTL(std::vector<float>* inputMatrix);

	bool verifyEqual(const std::vector<std::vector<float> >& pA, const std::vector<std::vector<float> >& pB);

} // end namespace tools