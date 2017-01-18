#pragma once
#include "profiler.h"
#include "CL\cl.h"

namespace tools
{
	float GetInput(const std::string& prompt);

	std::vector<std::string> split(const std::string& str, const char* delim);

	void generateInputFloat4(cl_float4* inputArray, cl_uint arrayWidth, cl_uint arrayHeight);

	void generateInputFloat16(cl_float16* inputArray, cl_uint arrayWidth, cl_uint arrayHeight);

	void generateInputCL(cl_float* inputArray, cl_uint arrayWidth, cl_uint arrayHeight);

	void generateInputCMatrix(float arr[1024][1024]);
	
	void generateInputC(float* inputArray, size_t arrayWidth, size_t arrayHeight);
	
	void generateInputSTL(std::vector<float>* inputMatrix);

	bool verifyEqual(const std::vector<std::vector<float> >& pA, const std::vector<std::vector<float> >& pB);

} // end namespace tools